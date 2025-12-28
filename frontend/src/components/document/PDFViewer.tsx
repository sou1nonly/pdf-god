import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import './pdf-viewer.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFPageProps {
  pageNumber: number;
  pdfDocument: any;
  scale: number;
  rotation: number;
  onInView: (pageNumber: number) => void;
  fitToWidth?: boolean;
  containerWidth?: number;
}

const PDFPage = ({ pageNumber, pdfDocument, scale, rotation, onInView, fitToWidth, containerWidth }: PDFPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null); // Track current render task
  const [rendering, setRendering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Intersection Observer to detect visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            onInView(pageNumber);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageNumber, onInView]);

  // Render Page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !isVisible) return;

    // Cancel any previous render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const renderPage = async () => {
      try {
        setRendering(true);
        const page = await pdfDocument.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        let viewport = page.getViewport({
          scale: scale,
          rotation: rotation,
        });

        if (fitToWidth && containerWidth && containerWidth > 0) {
          const unscaledViewport = page.getViewport({ scale: 1, rotation: rotation });
          const newScale = containerWidth / unscaledViewport.width;
          viewport = page.getViewport({ scale: newScale, rotation: rotation });
        }

        setDimensions({ width: viewport.width, height: viewport.height });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Store render task so we can cancel it if needed
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        // Render Text Layer
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.height = `${viewport.height}px`;
          textLayerRef.current.style.width = `${viewport.width}px`;

          const textContent = await page.getTextContent();
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport
          });
          await textLayer.render();
        }

        // Render Annotation Layer (wrapped in try-catch for linkService issues)
        if (annotationLayerRef.current) {
          try {
            annotationLayerRef.current.innerHTML = '';
            annotationLayerRef.current.style.height = `${viewport.height}px`;
            annotationLayerRef.current.style.width = `${viewport.width}px`;

            const annotations = await page.getAnnotations();
            if (annotations && annotations.length > 0) {
              const annotationLayer = new pdfjsLib.AnnotationLayer({
                div: annotationLayerRef.current,
                viewport: viewport.clone({ dontFlip: true }),
                page: page,
                accessibilityManager: null,
                annotationCanvasMap: null,
                annotationEditorUIManager: null,
                structTreeLayer: null,
                commentManager: null,
                linkService: null,
                annotationStorage: null
              });
              await annotationLayer.render({
                annotations,
                viewport: viewport.clone({ dontFlip: true }),
                div: annotationLayerRef.current,
                page: page,
                linkService: null,
                downloadManager: null,
                renderForms: false, // Disable forms to avoid linkService issues
              });
            }
          } catch (annotationError) {
            // Silently ignore annotation layer errors (common with null linkService)
            console.debug('Annotation layer skipped:', annotationError);
          }
        }

        setRendering(false);
      } catch (error: any) {
        // Ignore cancelled render errors
        if (error?.name === 'RenderingCancelledException') {
          return;
        }
        console.error(`Error rendering page ${pageNumber}:`, error);
        setRendering(false);
      }
    };

    renderPage();

    // Cleanup: cancel render on unmount or dependency change
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, pageNumber, scale, rotation, isVisible, fitToWidth, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="relative shadow-sm mb-2 transition-all duration-200"
      style={{
        width: dimensions.width || 'auto',
        height: dimensions.height || 'auto',
      }}
      id={`page-${pageNumber}`}
    >
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="textLayer" />
      <div ref={annotationLayerRef} className="annotationLayer" />

      {/* Page Number Indicator */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {pageNumber}
      </div>
    </div>
  );
};

interface PDFViewerProps {
  url?: string;
  file?: File;
  initialZoom?: number;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  scale?: number;
  currentPage?: number;
  totalPages?: number;
  onDocumentLoad?: (pdf: any) => void;
  rotation?: number;
  fitToWidth?: boolean;
  containerWidth?: number;
}

export const PDFViewer = ({
  url,
  file,
  initialZoom = 100,
  onPageChange,
  onZoomChange,
  scale,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  onDocumentLoad,
  rotation: externalRotation = 0,
  fitToWidth,
  containerWidth,
}: PDFViewerProps) => {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [internalTotalPages, setInternalTotalPages] = useState(0);
  const [rotation, setRotation] = useState(externalRotation);
  const [loading, setLoading] = useState(true);
  const internalPageRef = useRef(1);

  useEffect(() => {
    setRotation(externalRotation);
  }, [externalRotation]);

  const zoom = scale ? scale / 100 : (initialZoom / 100);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        let loadingTask;

        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } else if (url) {
          loadingTask = pdfjsLib.getDocument(url);
        } else {
          return;
        }

        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setInternalTotalPages(pdf.numPages);
        if (onDocumentLoad) onDocumentLoad(pdf);
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF', {
          description: error.message || 'Unknown error occurred'
        });
        setLoading(false);
      }
    };

    loadPDF();
  }, [url, file]);

  // Handle scrolling to specific page
  useEffect(() => {
    if (externalCurrentPage && !loading && externalCurrentPage !== internalPageRef.current) {
      const pageElement = document.getElementById(`page-${externalCurrentPage}`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
        internalPageRef.current = externalCurrentPage;
      }
    }
  }, [externalCurrentPage, loading]);

  const handlePageInView = useCallback((pageNumber: number) => {
    internalPageRef.current = pageNumber;
    if (onPageChange) {
      onPageChange(pageNumber);
    }
  }, [onPageChange]);

  // Sync scale with parent when in fitToWidth mode
  useEffect(() => {
    if (fitToWidth && pdfDocument && containerWidth && containerWidth > 0 && onZoomChange) {
      const calculateFitScale = async () => {
        try {
          const page = await pdfDocument.getPage(1);
          const viewport = page.getViewport({ scale: 1 });
          // Subtract a small buffer to prevent oscillation
          const newScalePercent = Math.floor((containerWidth / viewport.width) * 100);

          if (scale && Math.abs(newScalePercent - scale) > 2) {
            onZoomChange(newScalePercent);
          }
        } catch (e) {
          console.error('Error calculating fit scale', e);
        }
      };
      calculateFitScale();
    }
  }, [fitToWidth, pdfDocument, containerWidth, onZoomChange, scale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No PDF loaded</p>
          <p className="text-sm text-muted-foreground">Upload a PDF to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-muted/30 p-8">
      <div className="flex flex-col items-center gap-4 min-h-full">
        {Array.from({ length: internalTotalPages }, (_, i) => (
          <PDFPage
            key={i + 1}
            pageNumber={i + 1}
            pdfDocument={pdfDocument}
            scale={zoom}
            rotation={rotation}
            onInView={handlePageInView}
            fitToWidth={fitToWidth}
            containerWidth={containerWidth}
          />
        ))}
      </div>
    </div>
  );
};
