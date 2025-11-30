import { pipeline, env } from '@xenova/transformers';

// Configure to load models from local public folder or CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

class SemanticAnalyzer {
  private static instance: SemanticAnalyzer;
  private extractor: any = null;
  private classifier: any = null;
  private isReady = false;

  private constructor() {}

  public static getInstance(): SemanticAnalyzer {
    if (!SemanticAnalyzer.instance) {
      SemanticAnalyzer.instance = new SemanticAnalyzer();
    }
    return SemanticAnalyzer.instance;
  }

  public async init() {
    if (this.isReady) return;

    try {
      // Load a small, fast model for feature extraction (embeddings)
      // all-MiniLM-L6-v2 is ~80MB and very good for semantic similarity
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      // Optional: Zero-shot classification for block types (heavier, maybe load on demand)
      // this.classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
      
      this.isReady = true;
      console.log('AI Models loaded successfully');
    } catch (error) {
      console.error('Failed to load AI models:', error);
      throw error;
    }
  }

  /**
   * Calculates the semantic similarity between two text strings.
   * Returns a score between -1 and 1 (cosine similarity).
   */
  public async getSimilarity(text1: string, text2: string): Promise<number> {
    if (!this.isReady) await this.init();

    const output1 = await this.extractor(text1, { pooling: 'mean', normalize: true });
    const output2 = await this.extractor(text2, { pooling: 'mean', normalize: true });

    const vec1 = output1.data;
    const vec2 = output2.data;

    // Cosine similarity
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }

    return dotProduct;
  }

  /**
   * Classifies a text block into a semantic role using heuristics + embeddings.
   * (Full zero-shot is too slow for real-time hydration of many blocks, so we use a hybrid approach)
   */
  public async predictRole(text: string, currentRole: string): Promise<string> {
    // If it's already strongly identified as a header by font size, trust it.
    if (currentRole === 'h1' || currentRole === 'h2') return currentRole;

    // Use embeddings to check against prototypes if ambiguous
    // This is a simplified example. In production, you'd cache these prototypes.
    /*
    const prototypes = {
      'caption': 'Figure 1. Graph showing results.',
      'footer': 'Page 1 of 10 | Confidential',
      'list': '• First item in the list'
    };
    */
    
    // For now, we'll stick to the heuristic role unless we implement the full classifier
    return currentRole;
  }
}

export const semanticAnalyzer = SemanticAnalyzer.getInstance();
