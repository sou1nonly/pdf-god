/**
 * Gemini AI Service for Sprint 4 AI Features
 * Uses Google's Gemini 2.0 Flash model
 */

// Get API key from environment variable
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Warn if API key is not configured
if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY is not set. AI features will not work.');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
  };
}

/**
 * Call Gemini API with a prompt
 */
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Call Gemini with chat history
 */
async function callGeminiChat(
  messages: ChatMessage[],
  documentContext: string,
  newMessage: string
): Promise<string> {
  // Build conversation history
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Add new user message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  const body = {
    contents,
    systemInstruction: {
      parts: [{
        text: `You are a helpful AI assistant that answers questions about a PDF document. 
Be concise and accurate. If the answer isn't in the document, say so.
Always reference specific parts of the document when possible.

DOCUMENT CONTENT:
${documentContext.slice(0, 30000)}`
      }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Summarize document text
 */
export async function summarizeDocument(
  text: string,
  length: 'brief' | 'detailed' = 'brief'
): Promise<string> {
  const wordCount = length === 'brief' ? '100-150' : '300-400';
  
  const prompt = `Summarize the following document in approximately ${wordCount} words.
Focus on the main points, key arguments, and important conclusions.
Use clear, concise language.

DOCUMENT:
${text.slice(0, 30000)}`;

  const systemInstruction = 'You are a professional document summarizer. Create clear, accurate summaries.';
  
  return callGemini(prompt, systemInstruction);
}

/**
 * Chat about the document
 */
export async function chatWithDocument(
  documentText: string,
  messages: ChatMessage[],
  newMessage: string
): Promise<string> {
  return callGeminiChat(messages, documentText, newMessage);
}

/**
 * Rewrite text in different tones
 */
export async function rewriteText(
  text: string,
  tone: 'formal' | 'casual' | 'concise' | 'detailed'
): Promise<string[]> {
  const toneInstructions = {
    formal: 'Rewrite in a formal, professional tone suitable for business or academic documents.',
    casual: 'Rewrite in a casual, conversational tone while maintaining the meaning.',
    concise: 'Rewrite to be more concise and to-the-point, removing unnecessary words.',
    detailed: 'Rewrite with more detail and explanation, making it clearer and more comprehensive.'
  };

  const prompt = `${toneInstructions[tone]}

Provide 2 different rewrite options. Format your response as:
OPTION 1:
[rewritten text]

OPTION 2:
[rewritten text]

TEXT TO REWRITE:
${text}`;

  const response = await callGemini(prompt, 'You are a professional editor. Rewrite text while preserving the original meaning.');
  
  // Parse the response into options
  const options: string[] = [];
  const parts = response.split(/OPTION \d+:/i);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) {
      options.push(trimmed);
    }
  }
  
  return options.length > 0 ? options : [response];
}

/**
 * Extract key information from document
 */
export async function extractKeyInfo(text: string): Promise<{
  topics: string[];
  keyPoints: string[];
  entities: string[];
}> {
  const prompt = `Analyze this document and extract:
1. Main topics (3-5 topics)
2. Key points (5-7 bullet points)
3. Important entities (names, organizations, dates, etc.)

Format your response as JSON:
{
  "topics": ["topic1", "topic2"],
  "keyPoints": ["point1", "point2"],
  "entities": ["entity1", "entity2"]
}

DOCUMENT:
${text.slice(0, 20000)}`;

  const response = await callGemini(prompt, 'You are a document analyst. Extract information accurately and return valid JSON.');
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse key info:', e);
  }
  
  return { topics: [], keyPoints: [], entities: [] };
}

/**
 * Generate questions about the document
 */
export async function generateQuestions(text: string): Promise<string[]> {
  const prompt = `Based on this document, generate 5 insightful questions that someone might want to ask about the content. These should be questions that can be answered from the document.

Format: One question per line.

DOCUMENT:
${text.slice(0, 15000)}`;

  const response = await callGemini(prompt, 'You are a helpful assistant that generates relevant questions about documents.');
  
  return response
    .split('\n')
    .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(q => q.length > 10);
}
