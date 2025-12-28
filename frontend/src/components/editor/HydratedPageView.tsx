import React, { useState, useRef, useEffect, useContext } from 'react';
import { HydratedPage, TextBlockStyles, TextBlock as TextBlockType, ImageBlock as ImageBlockType } from '@/types/hydration';
import type { DrawingTool } from './types';
import { LayerCanvas } from './canvas/LayerCanvas';
import { Layer } from './types';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { SnapGuideContext } from './context/SnapGuideContext';

interface HydratedPageWithUrl extends HydratedPage {
  backgroundUrl?: string;
}

interface HydratedPageViewProps {
  page: HydratedPageWithUrl;
  scale?: number;
  fitToContainer?: boolean;
  containerWidth?: number;
  drawingTool?: DrawingTool;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  initialDrawingObjects?: any[]; // Legacy - kept for compatibility
  layerData?: Map<string, any[]>; // Layer ID -> objects for that layer
  onUpdateBlock?: (blockId: string, html: string) => void;
  onMoveBlock?: (blockId: string, newBox: [number, number, number, number]) => void;
  onUpdateBlockStyles?: (blockId: string, styles: Partial<TextBlockStyles>) => void;
  onDrawingChange?: (objects: any[]) => void;
  onLayerObjectsChange?: (layerId: string, objects: any[]) => void; // EditorPage adds pageIndex
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onSelectionChange?: (hasSelection: boolean) => void;
  onToolChange?: (tool: DrawingTool) => void;
  onTextEditingChange?: (isEditing: boolean, blockId?: string, styles?: any) => void;
  onAddTextBlock?: (box: [number, number, number, number], customId?: string) => void; // For text tool to create new PDF text blocks
  activeLayerId?: string;
  layers?: Layer[];
  onLayerCanvasReady?: (layerId: string, ref: any) => void;
  onZoomChange?: (zoom: number) => void;
  deselectSignal?: number;
  signatureToInsert?: string | null;
  onSignatureInserted?: () => void;
  linkToApply?: { url: string } | null;
  onLinkApplied?: () => void;
}

export const HydratedPageView: React.FC<HydratedPageViewProps> = React.memo(({
  page,
  scale = 1,
  fitToContainer = false,
  containerWidth = 0,
  drawingTool = 'select',
  strokeColor = '#000000',
  strokeWidth = 2,
  fillColor = 'transparent',
  opacity = 1,
  initialDrawingObjects,
  layerData,
  onUpdateBlock,
  onMoveBlock,
  onUpdateBlockStyles,
  onDrawingChange,
  onLayerObjectsChange,
  onHistoryChange,
  onSelectionChange,
  onToolChange,
  onTextEditingChange,
  onAddTextBlock,
  activeLayerId,
  layers = [],
  onLayerCanvasReady,
  onZoomChange,

  deselectSignal,
  signatureToInsert,
  onSignatureInserted,
  linkToApply,
  onLinkApplied,
}) => {
  // Handle deselect signal
  useEffect(() => {
    if (deselectSignal) {
      setSelectedBlockId(null);
    }
  }, [deselectSignal]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockWithTextSelection, setBlockWithTextSelection] = useState<string | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ type: 'h' | 'v'; position: number }[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, any>>(new Map());

  // Is drawing mode active (any tool except select)
  const isDrawingMode = drawingTool !== 'select';

  // Calculate effective scale based on fitToContainer mode
  const effectiveScale = React.useMemo(() => {
    if (fitToContainer && containerWidth > 0 && page?.dims?.width) {
      // Fit to width with no margin (padding is handled by parent container)
      return containerWidth / page.dims.width;
    }
    return scale;
  }, [fitToContainer, containerWidth, page?.dims?.width, scale]);

  // Sync effective scale back to parent zoom state when in fit-width mode
  useEffect(() => {
    if (fitToContainer && onZoomChange && effectiveScale) {
      // Convert scale (e.g. 1.42) to integer (142)
      const currentZoom = Math.floor(effectiveScale * 100);
      const parentZoom = Math.round(scale * 100);

      // Only update if difference is significant to avoid loops
      if (Math.abs(currentZoom - parentZoom) > 2) {
        onZoomChange(currentZoom);
      }
    }
  }, [fitToContainer, effectiveScale, onZoomChange, scale]);

  // Find selected block for toolbar - only show if text is selected inside
  const selectedBlock = blockWithTextSelection
    ? page.blocks.find(b => b.id === blockWithTextSelection && b.type === 'text') as TextBlockType | undefined
    : undefined;

  // A4 dimensions at 72 DPI = 595 x 842 points
  const pageWidth = page.dims.width * effectiveScale;
  const pageHeight = page.dims.height * effectiveScale;

  // Prepare all blocks for snapping reference
  const allBlocks = page.blocks.map(b => ({ id: b.id, box: b.box }));

  // Deselect when switching to drawing mode
  useEffect(() => {
    if (isDrawingMode) {
      setSelectedBlockId(null);
    }
  }, [isDrawingMode]);

  return (
    <SnapGuideContext.Provider value={{ activeGuides, setActiveGuides, allBlocks }}>
      <div className="relative w-full flex justify-center">
        <div className="relative" style={{ width: pageWidth, height: pageHeight }}>

          {/* Page Canvas - transparent background */}
          <div
            ref={pageRef}
            id={`page-${page.pageIndex + 1}`}
            className="relative mx-auto"
            style={{
              width: pageWidth,
              height: pageHeight,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              cursor: drawingTool === 'text' ? 'text' : undefined,
            }}
            onClick={(e) => {
              // Handle text tool - create new text block at click position
              if (drawingTool === 'text' && onAddTextBlock && pageRef.current) {
                const rect = pageRef.current.getBoundingClientRect();
                // Calculate position as percentage of page dimensions
                const xPercent = ((e.clientX - rect.left) / pageWidth) * 100;
                const yPercent = ((e.clientY - rect.top) / pageHeight) * 100;
                const wPercent = 20;
                const hPercent = 5;

                // Generate ID here to trigger immediate selection/editing
                const newId = `text-${Date.now()}`;

                onAddTextBlock([xPercent, yPercent, wPercent, hPercent], newId);

                // Auto-select and Enter Edit Mode
                setSelectedBlockId(newId);
                onTextEditingChange?.(true, newId);

                // Switch to select tool so we can interact/edit naturally
                onToolChange?.('select');
              } else {
                setSelectedBlockId(null);
              }
            }}
          >
            {/* Clean White Background */}
            <div className="absolute inset-0 bg-white" />

            {/* Page Content - Text Blocks (only interactive when PDF Content layer is active AND NOT using text tool) */}
            {/* Apply z-index based on pdf-content layer order for proper stacking */}
            {(() => {
              const pdfContentLayer = layers.find(l => l.id === 'pdf-content');
              const pdfZIndex = pdfContentLayer ? 10 + pdfContentLayer.order : 5;
              return (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: pdfZIndex,
                    pointerEvents: (activeLayerId === 'pdf-content' && drawingTool !== 'text') ? 'auto' : 'none'
                  }}
                >
                  {page.blocks.map((block) => {
                    if (block.type === 'text') {
                      return (
                        <TextBlock
                          key={block.id}
                          block={block}
                          scale={effectiveScale}
                          pageWidth={pageWidth}
                          pageHeight={pageHeight}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => !isDrawingMode && setSelectedBlockId(block.id)}
                          onUpdateContent={(html) => onUpdateBlock?.(block.id, html)}
                          onResize={(newBox) => onMoveBlock?.(block.id, newBox)}
                          onTextSelectionChange={(hasSelection) => {
                            setBlockWithTextSelection(hasSelection ? block.id : null);
                          }}
                          onUpdateStyles={(styles) => onUpdateBlockStyles?.(block.id, styles)}
                          onTextEditingChange={onTextEditingChange}
                        />
                      );
                    }

                    if (block.type === 'image') {
                      return (
                        <ImageBlock
                          key={block.id}
                          block={block as ImageBlockType}
                          scale={effectiveScale}
                          pageWidth={pageWidth}
                          pageHeight={pageHeight}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => !isDrawingMode && setSelectedBlockId(block.id)}
                          onResize={(newBox) => onMoveBlock?.(block.id, newBox)}
                        />
                      );
                    }

                    return null;
                  })}
                </div>
              );
            })()}

            {/* Multi-Layer Canvas System - Each layer is a separate canvas */}
            {/* Skip 'pdf-content' layer as it represents the text editing layer below */}
            {layers.filter(layer => layer.id !== 'pdf-content').map((layer, index) => (
              <LayerCanvas
                key={layer.id}
                ref={(el) => {
                  if (el) {
                    layerRefs.current.set(layer.id, el);
                    onLayerCanvasReady?.(layer.id, el);
                  } else {
                    layerRefs.current.delete(layer.id);
                  }
                }}
                layerId={layer.id}
                width={page.dims.width}
                height={page.dims.height}
                scale={effectiveScale}
                isActive={activeLayerId === layer.id}
                isVisible={layer.visible}
                isLocked={layer.locked}
                zIndex={10 + layer.order}
                activeTool={drawingTool}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                fillColor={fillColor}
                opacity={opacity}
                onObjectsChange={onLayerObjectsChange}
                onHistoryChange={onHistoryChange}
                onSelectionChange={onSelectionChange}
                onToolChange={onToolChange}
                onTextEditingChange={onTextEditingChange}
                deselectSignal={deselectSignal}
                signatureToInsert={activeLayerId === layer.id ? signatureToInsert : null}
                onSignatureInserted={onSignatureInserted}
                linkToApply={activeLayerId === layer.id ? linkToApply : null}
                onLinkApplied={onLinkApplied}
              />
            ))}

            {/* Page Number */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300 pointer-events-none">
              Page {page.pageIndex + 1}
            </div>
          </div>
        </div>
      </div>
    </SnapGuideContext.Provider>
  );
});
