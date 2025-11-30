import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

type SummarizationPipeline = any;
type QuestionAnsweringPipeline = any;
type TextGenerationPipeline = any;
type FeatureExtractionPipeline = any;

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

/**
 * Client-side AI Service using browser-based models
 * No API keys required - everything runs locally
 */
class ClientAIService {
  private static instance: ClientAIService;
  
  // Pipelines (lazy loaded)
  private summarizer: SummarizationPipeline | null = null;
  private qa: QuestionAnsweringPipeline | null = null;
  private generator: TextGenerationPipeline | null = null;
  private extractor: FeatureExtractionPipeline | null = null;
  
  // Loading states
  private loadingStates = {
    summarizer: false,
    qa: false,
    generator: false,
    extractor: false
  };

  private constructor() {}

  public static getInstance(): ClientAIService {
    if (!ClientAIService.instance) {
      ClientAIService.instance = new ClientAIService();
    }
    return ClientAIService.instance;
  }

  /**
   * Load summarization model (Xenova/distilbart-cnn-6-6 ~400MB)
   * Falls back to extractive summarization if model fails
   */
  private async loadSummarizer(): Promise<void> {
    if (this.summarizer || this.loadingStates.summarizer) return;
    
    this.loadingStates.summarizer = true;
    try {
      console.log('Loading summarization model...');
      this.summarizer = await pipeline(
        'summarization',
        'Xenova/distilbart-cnn-6-6'
      );
      console.log('Summarization model loaded');
    } catch (error) {
      console.error('Failed to load summarization model:', error);
      // Will use extractive fallback
    } finally {
      this.loadingStates.summarizer = false;
    }
  }

  /**
   * Load question-answering model (Xenova/distilbert-base-uncased-distilled-squad ~250MB)
   */
  private async loadQA(): Promise<void> {
    if (this.qa || this.loadingStates.qa) return;
    
    this.loadingStates.qa = true;
    try {
      console.log('Loading QA model...');
      this.qa = await pipeline(
        'question-answering',
        'Xenova/distilbert-base-uncased-distilled-squad'
      );
      console.log('QA model loaded');
    } catch (error) {
      console.error('Failed to load QA model:', error);
    } finally {
      this.loadingStates.qa = false;
    }
  }

  /**
   * Load feature extraction for embeddings (already have this)
   */
  private async loadExtractor(): Promise<void> {
    if (this.extractor || this.loadingStates.extractor) return;
    
    this.loadingStates.extractor = true;
    try {
      console.log('Loading embeddings model...');
      this.extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      console.log('Embeddings model loaded');
    } catch (error) {
      console.error('Failed to load embeddings model:', error);
    } finally {
      this.loadingStates.extractor = false;
    }
  }

  /**
   * Summarize document text
   */
  public async summarize(
    text: string,
    length: 'brief' | 'detailed' = 'brief'
  ): Promise<SummaryResult> {
    // Truncate if too long (models have token limits)
    const maxChars = 4000;
    const truncatedText = text.length > maxChars 
      ? text.slice(0, maxChars) + '...' 
      : text;

    try {
      await this.loadSummarizer();
      
      if (this.summarizer) {
        const maxLength = length === 'brief' ? 100 : 250;
        const minLength = length === 'brief' ? 30 : 100;
        
        const result = await this.summarizer(truncatedText, {
          max_length: maxLength,
          min_length: minLength,
          do_sample: false
        });
        
        return {
          summary: result[0].summary_text,
          wordCount: result[0].summary_text.split(/\s+/).length
        };
      }
    } catch (error) {
      console.error('Summarization failed, using extractive fallback:', error);
    }
    
    // Extractive fallback: Get first N sentences
    return this.extractiveSummary(text, length);
  }

  /**
   * Simple extractive summarization fallback
   */
  private extractiveSummary(text: string, length: 'brief' | 'detailed'): SummaryResult {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const numSentences = length === 'brief' ? 3 : 7;
    
    // Score sentences by position and length
    const scored = sentences.map((s, i) => ({
      text: s.trim(),
      score: (1 / (i + 1)) + (s.length > 50 ? 0.5 : 0) // Earlier + longer = better
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    const summary = scored
      .slice(0, numSentences)
      .sort((a, b) => sentences.indexOf(a.text) - sentences.indexOf(b.text))
      .map(s => s.text)
      .join(' ');
    
    return {
      summary,
      wordCount: summary.split(/\s+/).length
    };
  }

  /**
   * Answer questions about the document
   */
  public async chat(
    question: string,
    context: string,
    _history: ChatMessage[] = []
  ): Promise<ChatResult> {
    // Truncate context if too long
    const maxChars = 3000;
    const truncatedContext = context.length > maxChars 
      ? context.slice(0, maxChars) 
      : context;

    try {
      await this.loadQA();
      
      if (this.qa) {
        const result = await this.qa(question, truncatedContext);
        
        return {
          answer: result.answer || "I couldn't find an answer to that question in the document.",
          confidence: result.score || 0
        };
      }
    } catch (error) {
      console.error('QA failed:', error);
    }
    
    // Fallback: Simple keyword matching
    return this.keywordSearch(question, context);
  }

  /**
   * Simple keyword search fallback for chat
   */
  private keywordSearch(question: string, context: string): ChatResult {
    const keywords = question
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['what', 'where', 'when', 'which', 'how', 'does', 'the', 'this', 'that'].includes(w));
    
    const sentences = context.match(/[^.!?]+[.!?]+/g) || [context];
    
    // Score sentences by keyword matches
    const scored = sentences.map(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const matches = keywords.filter(kw => lowerSentence.includes(kw)).length;
      return { text: sentence.trim(), score: matches };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    if (scored[0]?.score > 0) {
      return {
        answer: scored.slice(0, 2).map(s => s.text).join(' '),
        confidence: Math.min(scored[0].score / keywords.length, 1)
      };
    }
    
    return {
      answer: "I couldn't find relevant information about that in the document. Try asking a different question.",
      confidence: 0
    };
  }

  /**
   * Rewrite text in different tones
   * Uses rule-based transformations (no heavy model needed)
   */
  public async rewrite(
    text: string,
    tone: 'formal' | 'casual' | 'concise' | 'detailed'
  ): Promise<RewriteResult> {
    const suggestions: string[] = [];
    
    switch (tone) {
      case 'formal':
        suggestions.push(this.makeFormal(text));
        suggestions.push(this.makeFormal(text, true)); // Alternative
        break;
      case 'casual':
        suggestions.push(this.makeCasual(text));
        suggestions.push(this.makeCasual(text, true));
        break;
      case 'concise':
        suggestions.push(this.makeConcise(text));
        suggestions.push(this.makeConcise(text, true));
        break;
      case 'detailed':
        suggestions.push(this.makeDetailed(text));
        suggestions.push(this.makeDetailed(text, true));
        break;
    }
    
    // Filter out duplicates and empty
    const unique = [...new Set(suggestions.filter(s => s.trim() && s !== text))];
    
    return { suggestions: unique.length > 0 ? unique : [text] };
  }

  private makeFormal(text: string, variant = false): string {
    let result = text;
    
    // Contractions to full forms
    const contractions: Record<string, string> = {
      "don't": "do not", "doesn't": "does not", "didn't": "did not",
      "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
      "can't": "cannot", "shouldn't": "should not", "isn't": "is not",
      "aren't": "are not", "wasn't": "was not", "weren't": "were not",
      "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
      "I'm": "I am", "you're": "you are", "we're": "we are",
      "they're": "they are", "it's": "it is", "that's": "that is",
      "there's": "there is", "here's": "here is", "let's": "let us",
      "I've": "I have", "you've": "you have", "we've": "we have",
      "they've": "they have", "I'll": "I will", "you'll": "you will",
      "we'll": "we will", "they'll": "they will", "I'd": "I would"
    };
    
    for (const [contraction, full] of Object.entries(contractions)) {
      result = result.replace(new RegExp(contraction, 'gi'), full);
    }
    
    // Informal to formal word replacements
    const informal: Record<string, string> = variant 
      ? { "stuff": "materials", "things": "items", "get": "obtain", "got": "received", "lots": "numerous", "a lot": "significantly", "pretty": "quite", "really": "considerably", "big": "substantial", "small": "minimal" }
      : { "stuff": "content", "things": "elements", "get": "acquire", "got": "obtained", "lots": "many", "a lot": "considerably", "pretty": "rather", "really": "truly", "big": "large", "small": "minor" };
    
    for (const [inf, formal] of Object.entries(informal)) {
      result = result.replace(new RegExp(`\\b${inf}\\b`, 'gi'), formal);
    }
    
    return result;
  }

  private makeCasual(text: string, variant = false): string {
    let result = text;
    
    // Full forms to contractions
    const expansions: Record<string, string> = {
      "do not": "don't", "does not": "doesn't", "did not": "didn't",
      "will not": "won't", "would not": "wouldn't", "could not": "couldn't",
      "cannot": "can't", "should not": "shouldn't", "is not": "isn't",
      "are not": "aren't", "I am": "I'm", "you are": "you're",
      "we are": "we're", "they are": "they're", "it is": "it's",
      "I have": "I've", "you have": "you've", "I will": "I'll"
    };
    
    for (const [full, contraction] of Object.entries(expansions)) {
      result = result.replace(new RegExp(full, 'gi'), contraction);
    }
    
    // Formal to casual
    const formal: Record<string, string> = variant
      ? { "therefore": "so", "however": "but", "utilize": "use", "obtain": "get", "regarding": "about", "numerous": "lots of", "sufficient": "enough", "commence": "start", "terminate": "end", "prior to": "before" }
      : { "therefore": "that's why", "however": "though", "utilize": "use", "obtain": "grab", "regarding": "about", "numerous": "a bunch of", "sufficient": "enough", "commence": "kick off", "terminate": "wrap up", "prior to": "before" };
    
    for (const [form, casual] of Object.entries(formal)) {
      result = result.replace(new RegExp(`\\b${form}\\b`, 'gi'), casual);
    }
    
    return result;
  }

  private makeConcise(text: string, variant = false): string {
    let result = text;
    
    // Remove filler words
    const fillers = variant 
      ? ["actually", "basically", "certainly", "definitely", "essentially", "generally", "honestly", "obviously", "really", "simply", "very", "quite", "rather", "somewhat"]
      : ["actually", "basically", "certainly", "definitely", "essentially", "literally", "honestly", "obviously", "really", "simply", "just", "quite", "rather", "pretty much"];
    
    for (const filler of fillers) {
      result = result.replace(new RegExp(`\\b${filler}\\b\\s*`, 'gi'), '');
    }
    
    // Remove redundant phrases
    const redundant: Record<string, string> = {
      "in order to": "to",
      "due to the fact that": "because",
      "in the event that": "if",
      "at this point in time": "now",
      "for the purpose of": "for",
      "in spite of the fact that": "although",
      "with regard to": "about",
      "in addition to": "and",
      "as a result of": "from",
      "a large number of": "many"
    };
    
    for (const [phrase, concise] of Object.entries(redundant)) {
      result = result.replace(new RegExp(phrase, 'gi'), concise);
    }
    
    // Clean up extra spaces
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
  }

  private makeDetailed(text: string, variant = false): string {
    let result = text;
    
    // Add transitional phrases
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
    
    if (sentences.length > 1) {
      const transitions = variant
        ? ["Furthermore,", "Additionally,", "Moreover,", "In addition,", "Also,"]
        : ["Additionally,", "Furthermore,", "What's more,", "Beyond that,", "On top of that,"];
      
      result = sentences.map((s, i) => {
        if (i > 0 && i < sentences.length - 1 && Math.random() > 0.5) {
          const transition = transitions[i % transitions.length];
          return ` ${transition} ${s.trim().charAt(0).toLowerCase()}${s.trim().slice(1)}`;
        }
        return s;
      }).join('');
    }
    
    // Expand abbreviations
    const abbreviations: Record<string, string> = {
      "e.g.": "for example",
      "i.e.": "that is to say",
      "etc.": "and so forth",
      "vs.": "versus",
      "approx.": "approximately"
    };
    
    for (const [abbr, full] of Object.entries(abbreviations)) {
      result = result.replace(new RegExp(abbr.replace('.', '\\.'), 'gi'), full);
    }
    
    return result;
  }

  /**
   * Get embedding similarity between two texts
   */
  public async getSimilarity(text1: string, text2: string): Promise<number> {
    await this.loadExtractor();
    
    if (!this.extractor) return 0;
    
    const output1 = await this.extractor(text1, { pooling: 'mean', normalize: true });
    const output2 = await this.extractor(text2, { pooling: 'mean', normalize: true });
    
    const vec1 = output1.data;
    const vec2 = output2.data;
    
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    
    return dotProduct;
  }

  /**
   * Find most relevant chunks for a question
   */
  public async findRelevantChunks(
    question: string,
    chunks: string[],
    topK: number = 3
  ): Promise<string[]> {
    await this.loadExtractor();
    
    if (!this.extractor) return chunks.slice(0, topK);
    
    const questionEmbed = await this.extractor(question, { pooling: 'mean', normalize: true });
    
    const scored = await Promise.all(
      chunks.map(async (chunk) => {
        const chunkEmbed = await this.extractor(chunk, { pooling: 'mean', normalize: true });
        
        let dot = 0;
        for (let i = 0; i < questionEmbed.data.length; i++) {
          dot += questionEmbed.data[i] * chunkEmbed.data[i];
        }
        
        return { chunk, score: dot };
      })
    );
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, topK).map(s => s.chunk);
  }
}

export const clientAI = ClientAIService.getInstance();
