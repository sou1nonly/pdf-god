/**
 * HybridPDFEditor - New Native Approach
 * 
 * Combines:
 * - Layer 1: Native PDF Viewer (Chrome's built-in)
 * - Layer 2: Text Extraction (lazy-loaded)
 * - Layer 3: Editable Overlays (TipTap)
 * - Layer 4: Save Manager (flatten/stamp)
 */

import { useState, useEffect, useMemo } from 'react';
import { NativePDFViewer } from './NativePDFViewer';
import { useTextExtraction } from '@/hooks/useTextExtraction';
import { detectTextBlocks } from '@/lib/textDetection';
import type { TextBlock } from '@/types';

interface HybridPDFEditorProps {
  /** PDF document URL */
  pdfUrl: string;
  
  /** Editor width */
  width?: number;
  
  /** Editor height */
  height?: number;
  
  /** Active tool */
  activeTool?: 'select' | 'rectangle' | 'circle' | 'text' | 'highlight' | 'freehand';
  
  /** Callback when annotation is added */
  onAnnotationAdded?: (annotation: any) => void;
  
  /** Callback when editor state changes */
  onChange?: (state: any) => void;
  
  /** Additional CSS classes */
  className?: string;
}

export function HybridPDFEditor({
  pdfUrl,
  width = 800,
  height = 1000,
  activeTool = 'select',
  onAnnotationAdded,
  onChange,
  className,
}: HybridPDFEditorProps) {
  // Text extraction state
  const [showTextBlocks, setShowTextBlocks] = useState(false);
  const [detectedBlocks, setDetectedBlocks] = useState<TextBlock[]>([]);
  
  // Use text extraction hook (lazy loading)
  const { textContent, isLoading, error, progress, extract } = useTextExtraction(pdfUrl, false);

  /**
   * Detect text blocks when text content changes
   */
  useEffect(() => {
    if (textContent.size === 0) return;

    console.log('[HybridPDFEditor] Processing text content...');
    const allBlocks: TextBlock[] = [];

    textContent.forEach((pageContent, pageNumber) => {
      if (pageContent.runs.length > 0) {
        const blocks = detectTextBlocks(pageContent.runs, pageNumber, {
          detectColumns: true, // Enable column detection
        });
        allBlocks.push(...blocks);
      }
    });

    console.log(`[HybridPDFEditor] Detected ${allBlocks.length} text blocks`);
    setDetectedBlocks(allBlocks);
  }, [textContent]);

  /**
   * Handle text extraction toggle
   */
  const handleToggleTextDetection = async () => {
    if (showTextBlocks) {
      // Hide text blocks
      setShowTextBlocks(false);
    } else {
      // Extract text and show blocks
      if (textContent.size === 0) {
        console.log('[HybridPDFEditor] Starting text extraction...');
        await extract();
      }
      setShowTextBlocks(true);
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      {/* Layer 1: Native PDF Viewer */}
      <NativePDFViewer
        url={pdfUrl}
        width={width}
        height={height}
        activeTool={activeTool}
        onAnnotationAdded={onAnnotationAdded}
      />

      {/* Layer 2: Text Block Visualization (Debug Mode) */}
      {showTextBlocks && (
        <div className="absolute inset-0 pointer-events-none">
          {detectedBlocks.map((block) => (
            <div
              key={block.id}
              className="absolute border-2 border-blue-400 bg-blue-100 bg-opacity-20"
              style={{
                left: block.x,
                top: block.y,
                width: block.width,
                height: block.height,
              }}
              title={`Block: ${block.text.substring(0, 50)}...`}
            />
          ))}
        </div>
      )}

      {/* Text Extraction Progress */}
      {isLoading && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="text-sm font-medium mb-2">Extracting text...</div>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{progress}%</div>
        </div>
      )}

      {/* Text Extraction Error */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <div className="text-sm font-medium text-red-800 mb-1">Text extraction failed</div>
          <div className="text-xs text-red-600">{error.message}</div>
        </div>
      )}

      {/* Debug Toggle Button */}
      <button
        onClick={handleToggleTextDetection}
        className="absolute bottom-4 right-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors"
        disabled={isLoading}
      >
        {isLoading ? 'Extracting...' : showTextBlocks ? 'Hide Text Blocks' : 'Detect Text'}
      </button>

      {/* Stats Display (Debug) */}
      {showTextBlocks && detectedBlocks.length > 0 && (
        <div className="absolute bottom-16 right-4 bg-white border border-gray-300 rounded-lg p-3 text-xs space-y-1 shadow-sm">
          <div className="font-medium">Detection Stats:</div>
          <div>Text Blocks: {detectedBlocks.length}</div>
          <div>Pages: {textContent.size}</div>
          <div className="text-gray-500 text-[10px] mt-2">
            Click blocks to edit (coming soon)
          </div>
        </div>
      )}
    </div>
  );
}
