import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { logger } from '../utils/logger';

export const usePDFRenderer = (url: string, onPageCountChange?: (totalPages: number) => void) => {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);
  
  // Load PDF
  useEffect(() => {
    if (!url) {
      logger.warn('PDFRenderer', 'No URL provided');
      return;
    }
    
    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);
      const startTime = performance.now();
      
      try {
        logger.info('PDFRenderer', `Loading PDF from: ${url.substring(0, 50)}...`);
        
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        setPdfDocument(pdf);
        
        logger.info('PDFRenderer', `PDF loaded successfully: ${pdf.numPages} pages`);
        
        // Notify parent of total page count
        if (onPageCountChange) {
          onPageCountChange(pdf.numPages);
        }
        
        const loadTime = performance.now() - startTime;
        logger.perf('PDFRenderer', 'PDF load', loadTime);
        
        // Log PDF metadata
        const metadata = await pdf.getMetadata();
        logger.info('PDFRenderer', 'PDF Metadata', {
          title: (metadata.info as any)?.Title || 'Untitled',
          pages: pdf.numPages,
          version: (metadata.info as any)?.PDFFormatVersion,
        });
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('PDFRenderer', 'Failed to load PDF', err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [url, onPageCountChange]);
  
  const renderPage = useCallback(async (
    pageNumber: number,
    canvas: HTMLCanvasElement,
    zoom: number,
    rotation: number
  ): Promise<{ viewport: any; page: any }> => {
    if (!pdfDocument) {
      throw new Error('PDF document not loaded');
    }
    
    // Cancel any previous render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }
    
    const startTime = performance.now();
    logger.info('PDFRenderer', `Rendering page ${pageNumber} at ${zoom}% zoom`);
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: zoom / 100, rotation });
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      logger.info('PDFRenderer', `Canvas size: ${viewport.width}x${viewport.height}`);
      
      // Store the render task so it can be cancelled
      renderTaskRef.current = page.render({
        canvasContext: context,
        viewport: viewport,
      });
      
      await renderTaskRef.current.promise;
      
      const renderTime = performance.now() - startTime;
      logger.perf('PDFRenderer', `Page ${pageNumber} render`, renderTime);
      
      return { viewport, page };
      
    } catch (err: any) {
      // Ignore cancellation errors - they're expected during navigation
      if (err.name === 'RenderingCancelledException') {
        logger.info('PDFRenderer', `Page ${pageNumber} render cancelled (normal during navigation)`);
        // Return a dummy result to prevent errors downstream
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom / 100, rotation });
        return { viewport, page };
      }
      logger.error('PDFRenderer', `Failed to render page ${pageNumber}`, err);
      throw err;
    }
  }, [pdfDocument]);
  
  return {
    pdfDocument,
    isLoading,
    error,
    renderPage,
  };
};
