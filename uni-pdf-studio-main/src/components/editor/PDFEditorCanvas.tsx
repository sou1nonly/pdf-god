import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { EditorTool } from './EditorToolbar';
import { toast } from 'sonner';

// Import custom hooks
import { useCanvasScheduler } from './hooks/useCanvasScheduler';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { usePDFRenderer } from './hooks/usePDFRenderer';
import { useTextLayer } from './hooks/useTextLayer';
import { useSnappingGuidelines } from './hooks/useSnappingGuidelines';
import { usePerformanceMetrics } from './hooks/usePerformanceMetrics';
import { logger } from './utils/logger';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PDFEditorCanvasProps {
  url: string;
  currentPage: number;
  zoom: number;
  rotation: number;
  activeTool: EditorTool;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  isBold: boolean;
  isItalic: boolean;
  strokeWidth: number;
  strokeColor: string;
  highlightColor: string;
  highlightMode: 'rectangle' | 'pen';
  stampText: string;
  stampColor: string;
  fillColor: string;
  fillOpacity: number;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onObjectSelected?: (objectType: string | null, properties?: any) => void;
  onPageCountChange?: (totalPages: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export const PDFEditorCanvas = ({
  url,
  currentPage,
  zoom,
  rotation,
  activeTool,
  fontSize,
  fontFamily,
  textColor,
  isBold,
  isItalic,
  strokeWidth,
  strokeColor,
  highlightColor,
  highlightMode,
  stampText,
  stampColor,
  fillColor,
  fillOpacity,
  onHistoryChange,
  onObjectSelected,
  onPageCountChange,
  onZoomChange,
}: PDFEditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingPathRef = useRef<fabric.Path | null>(null);
  const pdfBackgroundSetRef = useRef<boolean>(false);
  const erasedObjectsRef = useRef<boolean>(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Active text object for formatting
  const [activeTextObject, setActiveTextObject] = useState<fabric.IText | null>(null);
  
  // Auto-save timer - save every 3 seconds
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const needsSaveRef = useRef<boolean>(false);
  
  // Rendering state to prevent concurrent renders
  const isRenderingRef = useRef<boolean>(false);
  const renderTaskRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRenderRef = useRef<{
    page: number;
    zoom: number;
    rotation: number;
  } | null>(null);
  
  // Initialize all custom hooks
  const { scheduleRender } = useCanvasScheduler(fabricCanvasRef);
  const { saveState, undo, redo, clearHistory } = useCanvasHistory(fabricCanvasRef, onHistoryChange);
  const { pdfDocument, isLoading: isPdfLoading, renderPage } = usePDFRenderer(url, onPageCountChange);
  const { renderTextLayer, clearCache, clearAllCache } = useTextLayer(activeTool);
  const { initGuidelinePool, clearGuidelines, handleObjectMoving: handleSnapping } = useSnappingGuidelines(fabricCanvasRef);
  const { trackRender } = usePerformanceMetrics();
  
  logger.info('PDFEditorCanvas', 'Component initialized with hooks');

  // Mark that canvas needs to be saved (without actually saving yet)
  const markNeedsSave = useCallback(() => {
    needsSaveRef.current = true;
  }, []);

  // Expose undo/redo to parent
  useEffect(() => {
    (window as any).editorUndo = undo;
    (window as any).editorRedo = redo;
  }, [undo, redo]);

  // Auto-save interval - saves every 3 seconds if changes were made
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!needsSaveRef.current) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (needsSaveRef.current && fabricCanvasRef.current) {
        saveState();
        needsSaveRef.current = false;
      }
    }, 3000); // 3 seconds of inactivity before save
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [needsSaveRef.current, saveState]); // Re-run when save flag changes

  // Render PDF page
  useEffect(() => {
    // Reset background flag when dependencies change (page/zoom/rotation)
    pdfBackgroundSetRef.current = false;
    
    // Clear any pending timeout
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    
    // Store pending render request
    pendingRenderRef.current = {
      page: currentPage,
      zoom: zoom,
      rotation: rotation
    };
    
    // Debounce rapid changes (wait 100ms)
    renderTimeoutRef.current = setTimeout(() => {
      const renderPDFPage = async () => {
        if (!pdfDocument || !canvasRef.current || !containerRef.current) return;
        
        // Cancel any ongoing render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            logger.info('PDFEditorCanvas', 'Cancelled previous render for new request');
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }
        
        // Wait if currently rendering
        if (isRenderingRef.current) {
          logger.warn('PDFEditorCanvas', 'Waiting for current render to complete...');
          // Wait a bit and try again
          setTimeout(() => renderPDFPage(), 50);
          return;
        }
        
        isRenderingRef.current = true;

        try {
          logger.info('PDFEditorCanvas', `Rendering page ${currentPage} at ${zoom}% zoom`);
          const startTime = performance.now();
          
          // Use the hook's renderPage function
          const { viewport, page } = await renderPage(currentPage, canvasRef.current, zoom, rotation);

          // Track performance
          trackRender(performance.now() - startTime);

          // Render text layer using our hook
          if (textLayerRef.current) {
            await renderTextLayer(page, currentPage, zoom, textLayerRef.current);
          }

          // Initialize or update Fabric canvas
          if (!fabricCanvasRef.current) {
            const fabricCanvas = new fabric.Canvas('editor-canvas', {
              width: viewport.width,
              height: viewport.height,
              isDrawingMode: false,
              renderOnAddRemove: false,
              enableRetinaScaling: false,
              skipOffscreen: true,
              stateful: false,
            });
            
            fabricCanvasRef.current = fabricCanvas;
            
            // Initialize snapping guidelines
            initGuidelinePool();
            
            // Set PDF as background
            canvasRef.current.toBlob(async (blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              fabric.Image.fromURL(url, (img) => {
                img.set({ selectable: false, evented: false });
                fabricCanvasRef.current?.setBackgroundImage(img, () => {
                  scheduleRender();
                  URL.revokeObjectURL(url);
                });
              }, { crossOrigin: 'anonymous' });
            }, 'image/png');
            pdfBackgroundSetRef.current = true;

            // Save initial state
            saveState();
          } else {
            // Update canvas dimensions
            fabricCanvasRef.current.setWidth(viewport.width);
            fabricCanvasRef.current.setHeight(viewport.height);
            
            // Update background with new PDF render
            canvasRef.current.toBlob(async (blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              fabric.Image.fromURL(url, (img) => {
                img.set({ selectable: false, evented: false });
                fabricCanvasRef.current?.setBackgroundImage(img, () => {
                  scheduleRender();
                  URL.revokeObjectURL(url);
                });
              }, { crossOrigin: 'anonymous' });
            }, 'image/png');
            pdfBackgroundSetRef.current = true;
          }
          
          // Clear pending render
          pendingRenderRef.current = null;
          
        } catch (error: any) {
          // Don't log cancellation errors as errors
          if (error?.name === 'RenderingCancelledException') {
            logger.info('PDFEditorCanvas', 'Render cancelled (normal during navigation)');
            return;
          }
          logger.error('PDFEditorCanvas', 'Error rendering page:', error);
          console.error('Error rendering page:', error);
        } finally {
          isRenderingRef.current = false;
        }
      };

      renderPDFPage();
    }, 100); // 100ms debounce
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
    };
  }, [pdfDocument, currentPage, zoom, rotation, renderPage, renderTextLayer, saveState, initGuidelinePool, scheduleRender, trackRender]);

  // Handle tool changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Reset drawing mode
    canvas.isDrawingMode = false;
    canvas.selection = false; // Disable box selection for all tools
    
    // Make all objects non-selectable on single click
    // They can only be selected via double-click when in select mode
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = activeTool === 'select';
    });

    switch (activeTool) {
      case 'select':
        canvas.defaultCursor = 'default';
        break;
      case 'text':
        canvas.defaultCursor = 'text';
        break;
      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.freeDrawingBrush.color = strokeColor;
        break;
      case 'eraser':
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        break;
      default:
        canvas.defaultCursor = 'crosshair';
    }
  }, [activeTool, strokeWidth, strokeColor]);

  // Debounced effect for updating shape and text properties
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (!fabricCanvasRef.current) return;
      
      const canvas = fabricCanvasRef.current;
      const activeObject = canvas.getActiveObject();
      
      if (!activeObject) return;
      
      let updated = false;
      
      // Update shapes
      if (activeObject.type === 'rect' || activeObject.type === 'circle') {
        activeObject.set({
          fill: fillColor,
          opacity: fillOpacity / 100,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        });
        updated = true;
      }
      
      // Update paths/lines
      if (activeObject.type === 'line' || activeObject.type === 'path') {
        activeObject.set({
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        });
        updated = true;
      }
      
      // Update text
      if (activeObject.type === 'i-text') {
        const textObj = activeObject as fabric.IText;
        textObj.set({
          fontFamily: fontFamily,
          fontSize: fontSize,
          fill: textColor,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
        });
        updated = true;
      }
      
      if (updated) {
        scheduleRender();
        markNeedsSave();
      }
    }, 50); // 50ms debounce
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [fillColor, fillOpacity, strokeColor, strokeWidth, fontFamily, fontSize, textColor, isBold, isItalic]);

  const handlersRef = useRef({
    mouseDown: (e: any) => {},
    mouseMove: (e: any) => {},
    mouseUp: (e: any) => {},
    objectAdded: (e: any) => {},
  });

  // CREATE stable handlers (add as separate functions):
  const createMouseDownHandler = useCallback(() => {
    return (e: any) => {
      if (!e.pointer) return;
      
      const pointer = fabricCanvasRef.current?.getPointer(e.e);
      
      // Handle eraser - remove objects under cursor
      if (activeTool === 'eraser') {
        setIsDrawing(true);
        erasedObjectsRef.current = false; // Reset flag
        
        const eraserRadius = 10; // Fixed eraser size
        const objectsToRemove: fabric.Object[] = [];
        
        fabricCanvasRef.current.forEachObject((obj) => {
          if (obj === fabricCanvasRef.current?.backgroundImage) return;
          
          const objBounds = obj.getBoundingRect();
          if (
            pointer.x >= objBounds.left - eraserRadius &&
            pointer.x <= objBounds.left + objBounds.width + eraserRadius &&
            pointer.y >= objBounds.top - eraserRadius &&
            pointer.y <= objBounds.top + objBounds.height + eraserRadius
          ) {
            objectsToRemove.push(obj);
          }
        });
        
        if (objectsToRemove.length > 0) {
          erasedObjectsRef.current = true;
          objectsToRemove.forEach(obj => fabricCanvasRef.current?.remove(obj));
          scheduleRender();
        }
        return;
      }
      
      // For select tool, prevent single-click selection - only allow double-click
      if (activeTool === 'select') {
        const clickedObject = fabricCanvasRef.current.findTarget(e.e as any, false);
        if (clickedObject) {
          // Prevent selection on single click
          e.e.preventDefault();
          return;
        }
      }
      
      // For other tools, check if user is clicking on an existing object
      const clickedObject = fabricCanvasRef.current.findTarget(e.e as any, false);
      if (clickedObject && activeTool !== 'text') {
        // User is clicking on an existing object - allow selection/manipulation
        return;
      }
      
      setIsDrawing(true);

      switch (activeTool) {
        case 'text':
          const text = new fabric.IText('Type here', {
            left: pointer.x,
            top: pointer.y,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fill: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            selectable: false,
          });
          fabricCanvasRef.current.add(text);
          fabricCanvasRef.current.setActiveObject(text);
          text.enterEditing();
          saveState();
          break;

        case 'rectangle':
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: fillColor,
            opacity: fillOpacity / 100,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            selectable: false,
          });
          fabricCanvasRef.current.add(rect);
          fabricCanvasRef.current.setActiveObject(rect);
          break;

        case 'circle':
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: fillColor,
            opacity: fillOpacity / 100,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            selectable: false,
          });
          fabricCanvasRef.current.add(circle);
          fabricCanvasRef.current.setActiveObject(circle);
          break;

        case 'line':
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            selectable: false,
          });
          fabricCanvasRef.current.add(line);
          fabricCanvasRef.current.setActiveObject(line);
          break;

        case 'highlight':
          if (highlightMode === 'pen') {
            // Pen mode - enable drawing mode with semi-transparent brush
            fabricCanvasRef.current.isDrawingMode = true;
            fabricCanvasRef.current.freeDrawingBrush.width = strokeWidth;
            // Convert hex color to rgba with 0.4 opacity
            const rgb = parseInt(highlightColor.slice(1), 16);
            const r = (rgb >> 16) & 255;
            const g = (rgb >> 8) & 255;
            const b = rgb & 255;
            fabricCanvasRef.current.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.4)`;
          } else {
            // Rectangle mode - create a semi-transparent rectangle
            const rgb = parseInt(highlightColor.slice(1), 16);
            const r = (rgb >> 16) & 255;
            const g = (rgb >> 8) & 255;
            const b = rgb & 255;
            const highlight = new fabric.Rect({
              left: pointer.x,
              top: pointer.y,
              width: 0,
              height: 20,
              fill: `rgba(${r}, ${g}, ${b}, 0.3)`,
              stroke: 'transparent',
              selectable: false,
            });
            fabricCanvasRef.current.add(highlight);
            fabricCanvasRef.current.setActiveObject(highlight);
          }
          break;

        case 'stamp':
          // Create stamp with border and text
          const stampBg = new fabric.Rect({
            width: 150,
            height: 50,
            fill: 'transparent',
            stroke: stampColor,
            strokeWidth: 3,
            rx: 5,
            ry: 5,
          });
          
          const stampTextObj = new fabric.Text(stampText, {
            fontSize: 24,
            fill: stampColor,
            fontWeight: 'bold',
            fontFamily: 'Arial',
          });
          
          const stamp = new fabric.Group([stampBg, stampTextObj], {
            left: pointer.x,
            top: pointer.y,
            selectable: false,
          });
          
          fabricCanvasRef.current.add(stamp);
          saveState();
          break;
        
        case 'image':
          // Open file picker immediately when image tool is selected
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imgUrl = event.target?.result as string;
                fabric.Image.fromURL(imgUrl, (img) => {
                  if (!fabricCanvasRef.current) return;
                  
                  // Place image in center of canvas
                  const canvasWidth = fabricCanvasRef.current.width || 800;
                  const canvasHeight = fabricCanvasRef.current.height || 600;
                  
                  img.set({
                    left: (canvasWidth - (img.width || 0) * 0.5) / 2,
                    top: (canvasHeight - (img.height || 0) * 0.5) / 2,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    // Prevent flipping during resize
                    lockScalingFlip: true,
                    selectable: false,
                  });
                  
                  fabricCanvasRef.current.add(img);
                  fabricCanvasRef.current.setActiveObject(img);
                  fabricCanvasRef.current.requestRenderAll();
                  saveState();
                });
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
          break;
      }
    };
  }, [activeTool, fontSize, fontFamily, textColor, isBold, isItalic, strokeWidth, strokeColor, fillColor, fillOpacity, highlightColor, highlightMode, stampText, stampColor, saveState, scheduleRender]);

  // BIND ONCE in mount-only effect:
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    const mouseDown = (e: any) => handlersRef.current.mouseDown(e);
    const mouseMove = (e: any) => handlersRef.current.mouseMove(e);
    const mouseUp = (e: any) => handlersRef.current.mouseUp(e);
    
    canvas.on('mouse:down', mouseDown);
    canvas.on('mouse:move', mouseMove);
    canvas.on('mouse:up', mouseUp);
    
    return () => {
      canvas.off('mouse:down', mouseDown);
      canvas.off('mouse:move', mouseMove);
      canvas.off('mouse:up', mouseUp);
    };
  }, []); // Empty deps - bind once!

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' && fabricCanvasRef.current) {
        const activeObj = fabricCanvasRef.current.getActiveObject();
        if (activeObj) {
          fabricCanvasRef.current.remove(activeObj);
          saveState();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveState]);

  // Handle double-click for object selection
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    const handleDoubleClick = (e: fabric.IEvent) => {
      if (activeTool !== 'select') return;
      
      const pointer = canvas.getPointer(e.e);
      const clickedObject = canvas.findTarget(e.e as any, false);
      
      if (clickedObject) {
        canvas.setActiveObject(clickedObject);
        
        // If it's a text object, enter editing mode
        if (clickedObject.type === 'i-text') {
          (clickedObject as fabric.IText).enterEditing();
        }
        
        canvas.requestRenderAll();
      }
    };
    
    canvas.on('mouse:dblclick', handleDoubleClick);
    
    return () => {
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [activeTool]);

  // Track selection changes to update toolbar with selected text properties
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    const handleSelectionCreated = (e: any) => {
      const selected = e.selected?.[0];
      if (selected) {
        if (selected.type === 'i-text') {
          setActiveTextObject(selected as fabric.IText);
        }
        
        // Notify parent about selected object
        if (onObjectSelected) {
          const properties: any = {
            type: selected.type,
          };
          
          // Extract properties based on object type
          if (selected.type === 'rect' || selected.type === 'circle') {
            properties.fill = selected.fill;
            properties.opacity = (selected.opacity || 1) * 100;
            properties.stroke = selected.stroke;
            properties.strokeWidth = selected.strokeWidth;
          } else if (selected.type === 'line' || selected.type === 'path') {
            properties.stroke = selected.stroke;
            properties.strokeWidth = selected.strokeWidth;
          } else if (selected.type === 'i-text') {
            properties.fill = selected.fill;
            properties.fontSize = selected.fontSize;
            properties.fontFamily = selected.fontFamily;
            properties.fontWeight = selected.fontWeight;
            properties.fontStyle = selected.fontStyle;
          }
          
          onObjectSelected(selected.type, properties);
        }
      }
    };
    
    const handleSelectionCleared = () => {
      setActiveTextObject(null);
      if (onObjectSelected) {
        onObjectSelected(null);
      }
    };
    
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionCreated);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    return () => {
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionCreated);
      canvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [onObjectSelected]);

  const createMouseMoveHandler = useCallback(() => {
    return (e: any) => {
      if (!isDrawing || !fabricCanvasRef.current) return;

      const pointer = fabricCanvasRef.current.getPointer(e.e);
      const activeObj = fabricCanvasRef.current.getActiveObject();
      
      // Handle eraser - remove objects under cursor while dragging
      if (activeTool === 'eraser') {
        const eraserRadius = 10;
        const objectsToRemove: fabric.Object[] = [];
        
        fabricCanvasRef.current.forEachObject((obj) => {
          if (obj === fabricCanvasRef.current?.backgroundImage) return;
          
          const objBounds = obj.getBoundingRect();
          if (
            pointer.x >= objBounds.left - eraserRadius &&
            pointer.x <= objBounds.left + objBounds.width + eraserRadius &&
            pointer.y >= objBounds.top - eraserRadius &&
            pointer.y <= objBounds.top + objBounds.height + eraserRadius
          ) {
            objectsToRemove.push(obj);
          }
        });
        
        if (objectsToRemove.length > 0) {
          erasedObjectsRef.current = true;
          objectsToRemove.forEach(obj => fabricCanvasRef.current?.remove(obj));
          scheduleRender();
        }
        return;
      }

      if (!activeObj) return;

      switch (activeTool) {
        case 'rectangle':
          const rect = activeObj as fabric.Rect;
          rect.set({
            width: Math.abs(pointer.x - rect.left!),
            height: Math.abs(pointer.y - rect.top!),
          });
          break;

        case 'circle':
          const circle = activeObj as fabric.Circle;
          const radius = Math.sqrt(
            Math.pow(pointer.x - circle.left!, 2) + Math.pow(pointer.y - circle.top!, 2)
          );
          circle.set({ radius });
          break;

        case 'line':
          const line = activeObj as fabric.Line;
          line.set({
            x2: pointer.x,
            y2: pointer.y,
          });
          break;

        case 'highlight':
          if (highlightMode === 'rectangle') {
            const highlight = activeObj as fabric.Rect;
            highlight.set({
              width: Math.abs(pointer.x - highlight.left!),
            });
          }
          break;
      }

      scheduleRender();
    };
  }, [isDrawing, activeTool, highlightMode, scheduleRender]);

  const createMouseUpHandler = useCallback(() => {
    return () => {
      if (isDrawing) {
        setIsDrawing(false);
        
        // Save state after erasing if any objects were removed
        if (activeTool === 'eraser' && erasedObjectsRef.current) {
          saveState();
        }
        // Save state after drawing shapes
        else if (activeTool !== 'select' && activeTool !== 'eraser') {
          saveState();
        }
        
        // Turn off drawing mode after highlight pen
        if (activeTool === 'highlight' && highlightMode === 'pen' && fabricCanvasRef.current) {
          fabricCanvasRef.current.isDrawingMode = false;
        }
      }
    };
  }, [isDrawing, activeTool, highlightMode, saveState]);

  // UPDATE handlers ref when deps change:
  useEffect(() => {
    handlersRef.current.mouseDown = createMouseDownHandler();
    handlersRef.current.mouseMove = createMouseMoveHandler();
    handlersRef.current.mouseUp = createMouseUpHandler();
  }, [activeTool, createMouseDownHandler, createMouseMoveHandler, createMouseUpHandler]);

  // Guideline pool setup
  const guidelinePoolRef = useRef<{
    vertical: fabric.Line[],
    horizontal: fabric.Line[],
    initialized: boolean
  }>({ vertical: [], horizontal: [], initialized: false });

  const movingScheduledRef = useRef(false);
  const aligningLineMargin = 5;
  const aligningLineColor = 'rgb(0, 255, 0)';
  const aligningLineWidth = 1;

  // Snapping guidelines when moving objects
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    const handleObjectModified = () => {
      clearGuidelines();
    };
    
    const handleObjectScaling = (e: any) => {
      const obj = e.target;
      
      // Fix image inversion during resize
      if (obj && obj.type === 'image') {
        // If scale is negative, flip it back to positive and adjust position
        if (obj.scaleX < 0) {
          obj.scaleX = Math.abs(obj.scaleX);
          obj.flipX = !obj.flipX;
        }
        if (obj.scaleY < 0) {
          obj.scaleY = Math.abs(obj.scaleY);
          obj.flipY = !obj.flipY;
        }
        obj.setCoords();
        canvas.requestRenderAll();
      }
    };
    
    canvas.on('object:moving', handleSnapping);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('mouse:up', clearGuidelines);
    
    return () => {
      canvas.off('object:moving', handleSnapping);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('mouse:up', clearGuidelines);
    };
  }, [clearGuidelines, handleSnapping]);

  // Add mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl key is pressed (or Cmd on Mac)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Determine zoom direction
        const delta = e.deltaY > 0 ? -5 : 5;
        const newZoom = Math.max(10, Math.min(300, zoom + delta));
        
        if (onZoomChange) {
          onZoomChange(newZoom);
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, onZoomChange]);

  // Call initialization in Fabric canvas setup
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const fabricCanvas = fabricCanvasRef.current;

    // Set PDF as background
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      fabric.Image.fromURL(url, (img) => {
        img.set({ selectable: false, evented: false });
        fabricCanvas.setBackgroundImage(img, () => {
          scheduleRender();
          URL.revokeObjectURL(url);
        });
      }, { crossOrigin: 'anonymous' });
    }, 'image/png');
    pdfBackgroundSetRef.current = true;

    // Initialize guideline pool
    initGuidelinePool();
  }, [initGuidelinePool, scheduleRender]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup Fabric canvas
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      
      // Clear all caches using hooks
      clearAllCache?.();
      clearHistory?.();
    };
  }, [clearHistory, clearAllCache]);

  return (
    <div ref={containerRef} className="relative overflow-auto bg-gray-100 flex items-center justify-center p-4">
      <div className="relative shadow-lg">
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas id="editor-canvas" />
        <div 
          ref={textLayerRef}
          className="absolute top-0 left-0"
          style={{
            pointerEvents: 'none', // Container doesn't capture events, only text spans do
            userSelect: activeTool === 'select' ? 'text' : 'none',
            cursor: activeTool === 'select' ? 'text' : 'default',
          }}
        />
      </div>
    </div>
  );
};
