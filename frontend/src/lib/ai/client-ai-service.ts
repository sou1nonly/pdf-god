/**
 * Client AI Service - Uses Backend Gemini API
 * NO browser models - all AI calls go to backend
 */

import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SummaryResult {
  summary: string;
  wordCount: number;
}

interface ChatResult {
  answer: string;
  confidence: number;
}

interface RewriteResult {
  suggestions: string[];
}

// Uses query param routing: /api/ai?action=xxx
const API_BASE = '/api/ai';

// Helper to make API calls with auth
async function apiCall<T>(action: string, body: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE}?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${err.substring(0, 100)}`);
  }

  const json = await response.json();
  // Handle both { data: {...} } and direct response formats
  return json.data || json;
}

/**
 * Client AI Service - Calls Backend API (no browser models)
 */
class ClientAIService {
  private static instance: ClientAIService;

  private constructor() { }

  public static getInstance(): ClientAIService {
    if (!ClientAIService.instance) {
      ClientAIService.instance = new ClientAIService();
    }
    return ClientAIService.instance;
  }

  /**
   * Summarize document text via backend API
   */
  public async summarize(
    text: string,
    length: 'brief' | 'detailed' = 'brief'
  ): Promise<SummaryResult> {
    try {
      const result = await apiCall<{ summary: string; wordCount?: number }>('summarize', {
        documentText: text.slice(0, 15000),
        length
      });

      return {
        summary: result.summary,
        wordCount: result.wordCount || result.summary.split(/\s+/).length
      };
    } catch (error) {
      console.error('Summarization API failed:', error);
      // Simple extractive fallback
      return this.extractiveSummary(text, length);
    }
  }

  /**
   * Simple extractive summarization fallback
   */
  private extractiveSummary(text: string, length: 'brief' | 'detailed'): SummaryResult {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const numSentences = length === 'brief' ? 3 : 7;

    const summary = sentences.slice(0, numSentences).join(' ').trim();

    return {
      summary,
      wordCount: summary.split(/\s+/).length
    };
  }

  /**
   * Chat/Q&A via backend API
   */
  public async chat(
    question: string,
    context: string,
    _history: ChatMessage[] = []
  ): Promise<ChatResult> {
    try {
      const result = await apiCall<{ response: string; confidence?: number }>('chat', {
        message: question,
        documentText: context.slice(0, 15000),
        history: _history
      });

      return {
        answer: result.response,
        confidence: result.confidence || 0.9
      };
    } catch (error) {
      console.error('Chat API failed:', error);
      return {
        answer: "Sorry, I couldn't process your question. Please try again.",
        confidence: 0
      };
    }
  }

  /**
   * Rewrite text in different tones via backend API
   */
  public async rewrite(
    text: string,
    tone: 'formal' | 'casual' | 'concise' | 'detailed'
  ): Promise<RewriteResult> {
    try {
      const result = await apiCall<{ suggestions: string[] }>('rewrite', {
        text,
        tone
      });

      return {
        suggestions: result.suggestions || [text]
      };
    } catch (error) {
      console.error('Rewrite API failed:', error);
      // Return original text as fallback
      return { suggestions: [text] };
    }
  }

  /**
   * Get embedding similarity - not implemented (use backend RAG instead)
   */
  public async getSimilarity(_text1: string, _text2: string): Promise<number> {
    return 0.5;
  }

  /**
   * Find relevant chunks - not implemented (use backend RAG instead)
   */
  public async findRelevantChunks(
    _question: string,
    chunks: string[],
    topK: number = 3
  ): Promise<string[]> {
    return chunks.slice(0, topK);
  }
}

export const clientAI = ClientAIService.getInstance();
