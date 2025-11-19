/**
 * useTextExtraction Hook
 * 
 * Extracts text from PDF using PDF.js (lazy loaded).
 * Returns text runs with coordinates for text block detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TextRun, PageTextContent, TextExtractionResult, TextExtractionOptions } from '@/types';

interface UseTextExtractionReturn {
  /** Extracted text content per page */
  textContent: Map<number, PageTextContent>;
  
  /** Whether extraction is in progress */
  isLoading: boolean;
  
  /** Extraction error if any */
  error: Error | null;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Manually trigger extraction */
  extract: (options?: TextExtractionOptions) => Promise<void>;
  
  /** Clear extracted text */
  clear: () => void;
}

/**
 * Hook for extracting text from PDF documents
 */
export function useTextExtraction(
  pdfUrl: string | null,
  autoExtract: boolean = false
): UseTextExtractionReturn {
  const [textContent, setTextContent] = useState<Map<number, PageTextContent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Track if extraction is already in progress
  const isExtracting = useRef(false);
  const pdfDocRef = useRef<any>(null);

  /**
   * Extract text from PDF
   */
  const extract = useCallback(async (options?: TextExtractionOptions) => {
    if (!pdfUrl) {
      setError(new Error('No PDF URL provided'));
      return;
    }

    if (isExtracting.current) {
      console.warn('Extraction already in progress');
      return;
    }

    isExtracting.current = true;
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Lazy load PDF.js
      console.log('[useTextExtraction] Lazy loading PDF.js...');
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

      // Load PDF document
      console.log('[useTextExtraction] Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      pdfDocRef.current = pdfDoc;

      const startTime = Date.now();
      const pageCount = pdfDoc.numPages;
      const pagesToExtract = options?.pageNumbers || Array.from({ length: pageCount }, (_, i) => i + 1);
      
      console.log(`[useTextExtraction] Extracting text from ${pagesToExtract.length} pages...`);

      const newTextContent = new Map<number, PageTextContent>();

      // Extract text from each page
      for (let i = 0; i < pagesToExtract.length; i++) {
        const pageNum = pagesToExtract[i];
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Extract text content
        const textContent = await page.getTextContent({
          normalizeWhitespace: options?.normalizeWhitespace ?? true,
          disableCombineTextItems: options?.disableCombineTextItems ?? false,
        });

        // Convert to TextRun format
        const runs: TextRun[] = textContent.items
          .filter((item: any) => item.str && item.str.trim().length > 0)
          .map((item: any) => {
            const transform = item.transform;
            const fontSize = Math.sqrt(transform[0] ** 2 + transform[1] ** 2);
            
            // Filter by font size if specified
            if (options?.minFontSize && fontSize < options.minFontSize) return null;
            if (options?.maxFontSize && fontSize > options.maxFontSize) return null;

            return {
              str: item.str,
              x: transform[4],
              y: transform[5],
              width: item.width,
              height: item.height,
              fontSize,
              fontName: item.fontName,
              transform: transform,
              dir: item.dir,
            } as TextRun;
          })
          .filter(Boolean) as TextRun[];

        // Store page content
        newTextContent.set(pageNum - 1, {
          pageNumber: pageNum - 1,
          width: viewport.width,
          height: viewport.height,
          runs,
          lines: [], // Will be computed by text detection algorithm
          blocks: [], // Will be computed by text detection algorithm
          extractedAt: Date.now(),
        });

        // Update progress
        setProgress(Math.round(((i + 1) / pagesToExtract.length) * 100));
      }

      const extractionTime = Date.now() - startTime;
      console.log(`[useTextExtraction] Extraction complete in ${extractionTime}ms`);

      setTextContent(newTextContent);
      setProgress(100);
    } catch (err) {
      console.error('[useTextExtraction] Extraction failed:', err);
      setError(err instanceof Error ? err : new Error('Text extraction failed'));
    } finally {
      setIsLoading(false);
      isExtracting.current = false;
    }
  }, [pdfUrl]);

  /**
   * Clear extracted text
   */
  const clear = useCallback(() => {
    setTextContent(new Map());
    setError(null);
    setProgress(0);
    pdfDocRef.current = null;
  }, []);

  /**
   * Auto-extract when PDF URL changes
   */
  useEffect(() => {
    if (autoExtract && pdfUrl && !isExtracting.current) {
      extract();
    }
  }, [pdfUrl, autoExtract, extract]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  return {
    textContent,
    isLoading,
    error,
    progress,
    extract,
    clear,
  };
}
