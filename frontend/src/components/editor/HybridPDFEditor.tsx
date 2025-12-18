import { useEffect, useRef, useMemo } from 'react';
import { useHydrationEngine } from '@/hooks/engine/useHydrationEngine';
import { Loader2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SmartRenderer } from '@/components/renderer/SmartRenderer';
import { assemblePage } from '@/lib/ai/assembler';
import { SemanticBlock } from '@/types/semantic';
import { TextBlock } from '@/types/hydration';

interface HybridPDFEditorProps {
  pdfUrl: string;
  className?: string;
  // Kept for backward compatibility
  width?: number; 
  height?: number;
}

export function HybridPDFEditor({
  pdfUrl,
  className,
}: HybridPDFEditorProps) {
  // 1. Init Engine
  const { processFile, pages, status, error, progress, stageInfo } = useHydrationEngine();
  const processedUrlRef = useRef<string | null>(null);

  // Convert pages to semantic sections
  const semanticPages = useMemo(() => {
    if (!pages) return [];
    return pages.map(page => {
      const semanticBlocks: SemanticBlock[] = page.blocks
        .filter(b => b.type === 'text')
        .map(b => {
          const textBlock = b as TextBlock;
          // Simple heuristic: if font size > 16, it's a heading
          const isHeading = (textBlock.styles?.fontSize || 12) > 16;
          // Strip HTML tags for content
          const content = textBlock.html?.replace(/<[^>]*>/g, '') || '';
          
          return {
            id: b.id,
            type: isHeading ? 'heading' : 'paragraph',
            content,
            metadata: { confidence: 1.0 }
          };
        });
        
      return {
        ...page,
        sections: assemblePage(semanticBlocks)
      };
    });
  }, [pages]);

  // 2. Fetch & Process PDF
  useEffect(() => {
    const loadPdf = async () => {
      // Prevent reprocessing the same URL
      if (!pdfUrl || pdfUrl === processedUrlRef.current) return;
      
      try {
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        const file = new File([blob], "document.pdf", { type: "application/pdf" });
        
        processedUrlRef.current = pdfUrl;
        processFile(file);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };

    loadPdf();
  }, [pdfUrl, processFile]);

  // 3. Render States
  return (
    <div className={`relative flex flex-col h-full min-h-[500px] bg-slate-50/50 ${className || ''}`}>
      
      {/* A. Loading / Analyzing State */}
      {(status === 'processing') && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-all animate-in fade-in duration-300">
          <div className="w-full max-w-md p-8 space-y-8 text-center">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25"></div>
              <div className="relative bg-white p-4 rounded-full shadow-sm border border-blue-50">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                {stageInfo.stage === 'ai-init' ? 'Initializing AI Engine...' : 'Reconstructing Document'}
              </h3>
              <p className="text-sm text-gray-500 font-medium animate-pulse">
                {stageInfo.message || 'Analyzing layout structure and semantics...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Processing</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. Error State */}
      {status === 'error' && (
        <div className="flex items-center justify-center h-full">
          <div className="max-w-md p-8 bg-white rounded-xl shadow-lg border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">{error || "Could not process this document. Please try a different file."}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* C. Success State (Phase 3: Smart Renderer) */}
      {status === 'complete' && semanticPages.length > 0 ? (
        <ScrollArea className="flex-1 w-full h-full">
          <div className="py-12 px-4 space-y-12">
            
            {/* AI Badge Header */}
            <div className="max-w-[850px] mx-auto flex justify-between items-center pb-4 border-b border-gray-200/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-md">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">AI Layout Engine</span>
              </div>
              <div className="text-xs font-mono text-gray-400">
                {semanticPages.length} Pages Processed
              </div>
            </div>

            {/* Render Pages */}
            {semanticPages.map((page) => (
              <div key={page.pageIndex} className="relative transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                 {/* Page Indicator */}
                 <div className="absolute -left-4 xl:-left-16 top-0 text-xs font-mono text-slate-300 hidden md:block">
                    P.{page.pageIndex + 1}
                 </div>
                 
                 {/* The Reconstructed Paper */}
                 <SmartRenderer sections={page.sections} />
              </div>
            ))}

            <div className="h-20" /> {/* Bottom padding */}
          </div>
        </ScrollArea>
      ) : (
        // Idle State
        status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-medium">Ready to process document</p>
          </div>
        )
      )}
    </div>
  );
}
