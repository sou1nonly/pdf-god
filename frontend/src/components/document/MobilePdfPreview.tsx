import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface MobilePdfPreviewProps {
    pdfUrl: string | null;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const MobilePdfPreview = ({
    pdfUrl,
    currentPage,
    totalPages,
    onPageChange,
}: MobilePdfPreviewProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);

    // Load the PDF document from URL
    useEffect(() => {
        if (!pdfUrl) return;

        let cancelled = false;
        const loadPdf = async () => {
            setIsLoading(true);
            try {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                const pdf = await loadingTask.promise;
                if (!cancelled) {
                    setPdfDocument(pdf);
                }
            } catch (err) {
                console.error("[MobilePdfPreview] Failed to load PDF:", err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadPdf();
        return () => { cancelled = true; };
    }, [pdfUrl]);

    // Render the current page to canvas when expanded
    const renderPage = useCallback(async () => {
        if (!pdfDocument || !canvasRef.current || !isExpanded) return;

        try {
            // Cancel any in-progress render
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }

            const page = await pdfDocument.getPage(currentPage);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Scale to fit the container width (accounting for padding)
            const containerWidth = canvas.parentElement?.clientWidth || 320;
            const viewport = page.getViewport({ scale: 1 });
            const scale = (containerWidth * window.devicePixelRatio) / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${(scaledViewport.height / scaledViewport.width) * containerWidth}px`;

            const renderTask = page.render({
                canvasContext: ctx,
                viewport: scaledViewport,
            });
            renderTaskRef.current = renderTask;
            await renderTask.promise;
        } catch (err: any) {
            if (err?.name !== "RenderingCancelledException") {
                console.error("[MobilePdfPreview] render error:", err);
            }
        }
    }, [pdfDocument, currentPage, isExpanded]);

    useEffect(() => {
        renderPage();
    }, [renderPage]);

    // Don't render if there's no URL at all
    if (!pdfUrl) return null;

    return (
        <div className="shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
            {/* Collapsed bar — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full h-10 flex items-center justify-between px-4 active:bg-muted/40 transition-colors cursor-pointer"
            >
                <span className="text-[12px] font-semibold text-muted-foreground tracking-wide">
                    PAGE {currentPage} OF {totalPages || "…"}
                </span>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {/* Expanded preview */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isExpanded ? "max-h-[50vh] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="px-3 pb-3 flex flex-col">
                    {/* Canvas container — scrollable if tall */}
                    <div className="relative rounded-xl border border-border/30 bg-white overflow-y-auto shadow-layer-sm" style={{ maxHeight: "35vh" }}>
                        {isLoading ? (
                            <div className="h-48 flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        ) : pdfDocument ? (
                            <canvas ref={canvasRef} className="w-full block" />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-[12px]">
                                No preview available
                            </div>
                        )}
                    </div>

                    {/* Page navigation — always visible when expanded */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-2.5 shrink-0">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage <= 1}
                                className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center border border-border/30 transition-all cursor-pointer",
                                    currentPage <= 1
                                        ? "opacity-30 cursor-not-allowed"
                                        : "active:bg-primary/10 hover:border-primary/30"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4 text-foreground" />
                            </button>

                            <span className="text-[12px] font-semibold text-foreground min-w-[60px] text-center">
                                {currentPage} / {totalPages}
                            </span>

                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center border border-border/30 transition-all cursor-pointer",
                                    currentPage >= totalPages
                                        ? "opacity-30 cursor-not-allowed"
                                        : "active:bg-primary/10 hover:border-primary/30"
                                )}
                            >
                                <ChevronRight className="h-4 w-4 text-foreground" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
