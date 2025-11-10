import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { EditorTool } from './EditorToolbar';
import { toast } from 'sonner';

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
}: PDFEditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingPathRef = useRef<fabric.Path | null>(null);
  const pdfBackgroundSetRef = useRef<boolean>(false);
  const erasedObjectsRef = useRef<boolean>(false);
  
  // Snapping guidelines
  const aligningLineMargin = 10; // Increased from 4 for easier snapping
  const aligningLineWidth = 2; // Made thicker for better visibility
  const aligningLineColor = 'rgb(255, 0, 255)'; // Changed to magenta for better visibility
  const verticalLinesRef = useRef<fabric.Line[]>([]);
  const horizontalLinesRef = useRef<fabric.Line[]>([]);
  
  // History management
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const maxHistorySteps = 50;
  
  // Active text object for formatting
  const [activeTextObject, setActiveTextObject] = useState<fabric.IText | null>(null);
  
  // Auto-save timer - save every 3 seconds
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const needsSaveRef = useRef<boolean>(false);
  
  // Simple render function - just render, no throttling
  const simpleRender = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  // Save state to history
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const json = fabricCanvasRef.current.toJSON();
    
    // Remove future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(json);
    
    // Limit history size
    if (historyRef.current.length > maxHistorySteps) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }

    // Notify parent about undo/redo availability
    onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
  }, [onHistoryChange]);

  // Mark that canvas needs to be saved (without actually saving yet)
  const markNeedsSave = useCallback(() => {
    needsSaveRef.current = true;
  }, []);

  // Undo function
  const undo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [onHistoryChange]);

  // Redo function
  const redo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [onHistoryChange]);

  // Expose undo/redo to parent
  useEffect(() => {
    (window as any).editorUndo = undo;
    (window as any).editorRedo = redo;
  }, [undo, redo]);

  // Auto-save interval - saves every 3 seconds if changes were made
  useEffect(() => {
    const interval = setInterval(() => {
      if (needsSaveRef.current && fabricCanvasRef.current) {
        saveState();
        needsSaveRef.current = false;
      }
    }, 3000); // Every 3 seconds

    return () => clearInterval(interval);
  }, [saveState]);

  // Snapping helper functions
  const drawVerticalLine = useCallback((coords: any) => {
    if (!fabricCanvasRef.current) return null;
    
    const line = new fabric.Line(
      [coords.x, coords.y1 > coords.y2 ? coords.y2 : coords.y1, coords.x, coords.y2 > coords.y1 ? coords.y2 : coords.y1],
      {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
      }
    );
    fabricCanvasRef.current.add(line);
    return line;
  }, []);

  const drawHorizontalLine = useCallback((coords: any) => {
    if (!fabricCanvasRef.current) return null;
    
    const line = new fabric.Line(
      [coords.x1 > coords.x2 ? coords.x2 : coords.x1, coords.y, coords.x2 > coords.x1 ? coords.x2 : coords.x1, coords.y],
      {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
      }
    );
    fabricCanvasRef.current.add(line);
    return line;
  }, []);

  const clearGuidelines = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    verticalLinesRef.current.forEach(line => fabricCanvasRef.current?.remove(line));
    horizontalLinesRef.current.forEach(line => fabricCanvasRef.current?.remove(line));
    verticalLinesRef.current = [];
    horizontalLinesRef.current = [];
    fabricCanvasRef.current.renderAll();
  }, []);

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        
        // Notify parent of total page count
        if (onPageCountChange) {
          onPageCountChange(pdf.numPages);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF');
      }
    };

    if (url) {
      loadPDF();
    }
  }, [url]);

  // Render PDF page
  useEffect(() => {
    // Reset background flag when dependencies change (page/zoom/rotation)
    pdfBackgroundSetRef.current = false;
    
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current || !containerRef.current) return;

      try {
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom / 100, rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Initialize or update Fabric canvas
        if (!fabricCanvasRef.current) {
          const fabricCanvas = new fabric.Canvas('editor-canvas', {
            width: viewport.width,
            height: viewport.height,
            isDrawingMode: false,
            renderOnAddRemove: true,
            enableRetinaScaling: true,
            skipOffscreen: true,
            stateful: false,
          });
          
          fabricCanvasRef.current = fabricCanvas;
          
          // Set PDF as background
          fabricCanvas.setBackgroundImage(
            canvas.toDataURL(),
            () => fabricCanvas.requestRenderAll(),
            {
              scaleX: 1,
              scaleY: 1,
            }
          );
          pdfBackgroundSetRef.current = true;

          // Save initial state
          saveState();
        } else {
          // Update canvas dimensions
          fabricCanvasRef.current.setWidth(viewport.width);
          fabricCanvasRef.current.setHeight(viewport.height);
          
          // Update background with new PDF render
          fabricCanvasRef.current.setBackgroundImage(
            canvas.toDataURL(),
            () => fabricCanvasRef.current?.requestRenderAll(),
            {
              scaleX: 1,
              scaleY: 1,
            }
          );
          pdfBackgroundSetRef.current = true;
        }
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, zoom, rotation, saveState]);

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

  // Update shape fill and opacity when toolbar controls change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();

    if (activeObject && (activeObject.type === 'rect' || activeObject.type === 'circle')) {
      const currentFill = activeObject.fill;
      const currentOpacity = activeObject.opacity;
      const newOpacity = fillOpacity / 100;
      
      // Only update if values actually changed
      if (currentFill !== fillColor || currentOpacity !== newOpacity) {
        activeObject.set({
          fill: fillColor,
          opacity: newOpacity,
        });
        simpleRender();
        markNeedsSave();
      }
    }
  }, [fillColor, fillOpacity, markNeedsSave, simpleRender]);

  // Update stroke color and width when toolbar controls change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();

    if (activeObject && (activeObject.type === 'rect' || activeObject.type === 'circle' || activeObject.type === 'line' || activeObject.type === 'path')) {
      const currentStroke = activeObject.stroke;
      const currentStrokeWidth = activeObject.strokeWidth;
      
      // Only update if values actually changed
      if (currentStroke !== strokeColor || currentStrokeWidth !== strokeWidth) {
        activeObject.set({
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        });
        simpleRender();
        markNeedsSave();
      }
    }
  }, [strokeColor, strokeWidth, markNeedsSave, simpleRender]);

  // Update text formatting when toolbar controls change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const activeObj = canvas.getActiveObject();
    
    if (activeObj && activeObj.type === 'i-text') {
      const textObj = activeObj as fabric.IText;
      
      // Update font family
      if (textObj.fontFamily !== fontFamily) {
        textObj.set('fontFamily', fontFamily);
      }
      
      // Update font size
      if (textObj.fontSize !== fontSize) {
        textObj.set('fontSize', fontSize);
      }
      
      // Update text color
      if (textObj.fill !== textColor) {
        textObj.set('fill', textColor);
      }
      
      // Update bold
      const currentWeight = textObj.fontWeight;
      const shouldBeBold = isBold ? 'bold' : 'normal';
      if (currentWeight !== shouldBeBold) {
        textObj.set('fontWeight', shouldBeBold);
      }
      
      // Update italic
      const currentStyle = textObj.fontStyle;
      const shouldBeItalic = isItalic ? 'italic' : 'normal';
      if (currentStyle !== shouldBeItalic) {
        textObj.set('fontStyle', shouldBeItalic);
      }
      
      simpleRender();
      markNeedsSave();
    }
  }, [fontSize, fontFamily, textColor, isBold, isItalic, markNeedsSave, simpleRender]);

  // Handle canvas mouse events
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    const handleMouseDown = (e: fabric.IEvent) => {
      if (!e.pointer) return;
      
      const pointer = canvas.getPointer(e.e);
      
      // Handle eraser - remove objects under cursor
      if (activeTool === 'eraser') {
        setIsDrawing(true);
        erasedObjectsRef.current = false; // Reset flag
        
        const eraserRadius = 10; // Fixed eraser size
        const objectsToRemove: fabric.Object[] = [];
        
        canvas.forEachObject((obj) => {
          if (obj === canvas.backgroundImage) return;
          
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
          objectsToRemove.forEach(obj => canvas.remove(obj));
          simpleRender();
        }
        return;
      }
      
      // For select tool, prevent single-click selection - only allow double-click
      if (activeTool === 'select') {
        const clickedObject = canvas.findTarget(e.e as any, false);
        if (clickedObject) {
          // Prevent selection on single click
          e.e.preventDefault();
          return;
        }
      }
      
      // For other tools, check if user is clicking on an existing object
      const clickedObject = canvas.findTarget(e.e as any, false);
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
          canvas.add(text);
          canvas.setActiveObject(text);
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
          canvas.add(rect);
          canvas.setActiveObject(rect);
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
          canvas.add(circle);
          canvas.setActiveObject(circle);
          break;

        case 'line':
          const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            selectable: false,
          });
          canvas.add(line);
          canvas.setActiveObject(line);
          break;

        case 'highlight':
          if (highlightMode === 'pen') {
            // Pen mode - enable drawing mode with semi-transparent brush
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.width = strokeWidth;
            // Convert hex color to rgba with 0.4 opacity
            const rgb = parseInt(highlightColor.slice(1), 16);
            const r = (rgb >> 16) & 255;
            const g = (rgb >> 8) & 255;
            const b = rgb & 255;
            canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.4)`;
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
            canvas.add(highlight);
            canvas.setActiveObject(highlight);
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
          
          canvas.add(stamp);
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
                  // Place image in center of canvas
                  const canvasWidth = canvas.width || 800;
                  const canvasHeight = canvas.height || 600;
                  
                  img.set({
                    left: (canvasWidth - (img.width || 0) * 0.5) / 2,
                    top: (canvasHeight - (img.height || 0) * 0.5) / 2,
                    scaleX: 0.5,
                    scaleY: 0.5,
                    // Prevent flipping during resize
                    lockScalingFlip: true,
                    selectable: false,
                  });
                  
                  canvas.add(img);
                  canvas.setActiveObject(img);
                  canvas.requestRenderAll();
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

    const handleMouseMove = (e: fabric.IEvent) => {
      if (!e.pointer) return;

      const pointer = canvas.getPointer(e.e);
      
      // Handle eraser - continuously remove objects while dragging
      if (activeTool === 'eraser' && isDrawing) {
        const eraserRadius = 10; // Fixed eraser size
        const objectsToRemove: fabric.Object[] = [];
        
        canvas.forEachObject((obj) => {
          if (obj === canvas.backgroundImage) return;
          
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
          objectsToRemove.forEach(obj => canvas.remove(obj));
          simpleRender();
        }
        return;
      }
      
      if (!isDrawing) return;

      const activeObj = canvas.getActiveObject();

      if (!activeObj) return;

      switch (activeTool) {
        case 'rectangle':
          if (activeObj instanceof fabric.Rect) {
            const rect = activeObj as fabric.Rect;
            const width = pointer.x - (rect.left || 0);
            const height = pointer.y - (rect.top || 0);
            rect.set({ width: Math.abs(width), height: Math.abs(height) });
            if (width < 0) rect.set({ left: pointer.x });
            if (height < 0) rect.set({ top: pointer.y });
          }
          break;

        case 'circle':
          if (activeObj instanceof fabric.Circle) {
            const circle = activeObj as fabric.Circle;
            const dx = pointer.x - (circle.left || 0);
            const dy = pointer.y - (circle.top || 0);
            const radius = Math.sqrt(dx * dx + dy * dy);
            circle.set({ radius });
          }
          break;

        case 'line':
          if (activeObj instanceof fabric.Line) {
            const line = activeObj as fabric.Line;
            line.set({ x2: pointer.x, y2: pointer.y });
          }
          break;

        case 'highlight':
          // Only handle rectangle mode here, pen mode uses drawing mode
          if (highlightMode === 'rectangle' && activeObj instanceof fabric.Rect) {
            const highlight = activeObj as fabric.Rect;
            const width = pointer.x - (highlight.left || 0);
            highlight.set({ width: Math.abs(width) });
            if (width < 0) highlight.set({ left: pointer.x });
          }
          break;
      }

      simpleRender();
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        
        // For eraser, only save if objects were actually removed
        if (activeTool === 'eraser') {
          if (erasedObjectsRef.current) {
            saveState();
            erasedObjectsRef.current = false;
          }
          return;
        }
        
        if (['rectangle', 'circle', 'line', 'highlight'].includes(activeTool)) {
          saveState();
        }
      }
    };

    const handleObjectAdded = (e: any) => {
      const obj = e.target;
      
      // Make all newly added objects non-selectable by default
      if (obj) {
        obj.selectable = false;
        obj.evented = false;
      }
      
      if (activeTool === 'draw') {
        saveState();
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:added', handleObjectAdded);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('object:added', handleObjectAdded);
    };
  }, [activeTool, isDrawing, fontSize, fontFamily, textColor, isBold, isItalic, strokeWidth, strokeColor, saveState, simpleRender, highlightColor, highlightMode, stampText, stampColor, fillColor, fillOpacity]);

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

  // Snapping guidelines when moving objects
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    const handleObjectMoving = (e: any) => {
      const activeObject = e.target;
      if (!activeObject || !canvas) return;
      
      clearGuidelines();
      
      const canvasWidth = canvas.width || 0;
      const canvasHeight = canvas.height || 0;
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;
      
      // Get object bounding box for accurate dimensions
      const objectBounds = activeObject.getBoundingRect();
      const objectCenterX = objectBounds.left + objectBounds.width / 2;
      const objectCenterY = objectBounds.top + objectBounds.height / 2;
      const objectLeft = objectBounds.left;
      const objectTop = objectBounds.top;
      const objectRight = objectBounds.left + objectBounds.width;
      const objectBottom = objectBounds.top + objectBounds.height;
      
      let snapX = null;
      let snapY = null;
      
      // Check vertical center alignment
      if (Math.abs(objectCenterX - canvasCenterX) < aligningLineMargin) {
        const line = drawVerticalLine({
          x: canvasCenterX,
          y1: 0,
          y2: canvasHeight,
        });
        if (line) verticalLinesRef.current.push(line);
        snapX = canvasCenterX - objectBounds.width / 2;
      }
      
      // Check horizontal center alignment
      if (Math.abs(objectCenterY - canvasCenterY) < aligningLineMargin) {
        const line = drawHorizontalLine({
          x1: 0,
          x2: canvasWidth,
          y: canvasCenterY,
        });
        if (line) horizontalLinesRef.current.push(line);
        snapY = canvasCenterY - objectBounds.height / 2;
      }
      
      // Check left edge alignment (with canvas)
      if (Math.abs(objectLeft) < aligningLineMargin) {
        const line = drawVerticalLine({
          x: 0,
          y1: 0,
          y2: canvasHeight,
        });
        if (line) verticalLinesRef.current.push(line);
        snapX = 0;
      }
      
      // Check right edge alignment (with canvas)
      if (Math.abs(objectRight - canvasWidth) < aligningLineMargin) {
        const line = drawVerticalLine({
          x: canvasWidth,
          y1: 0,
          y2: canvasHeight,
        });
        if (line) verticalLinesRef.current.push(line);
        snapX = canvasWidth - objectBounds.width;
      }
      
      // Check top edge alignment (with canvas)
      if (Math.abs(objectTop) < aligningLineMargin) {
        const line = drawHorizontalLine({
          x1: 0,
          x2: canvasWidth,
          y: 0,
        });
        if (line) horizontalLinesRef.current.push(line);
        snapY = 0;
      }
      
      // Check bottom edge alignment (with canvas)
      if (Math.abs(objectBottom - canvasHeight) < aligningLineMargin) {
        const line = drawHorizontalLine({
          x1: 0,
          x2: canvasWidth,
          y: canvasHeight,
        });
        if (line) horizontalLinesRef.current.push(line);
        snapY = canvasHeight - objectBounds.height;
      }
      
      // Check alignment with other objects
      canvas.forEachObject((obj) => {
        if (obj === activeObject || obj.selectable === false || obj.evented === false) return;
        
        const objBounds = obj.getBoundingRect();
        const objCenterX = objBounds.left + objBounds.width / 2;
        const objCenterY = objBounds.top + objBounds.height / 2;
        const objLeft = objBounds.left;
        const objTop = objBounds.top;
        const objRight = objBounds.left + objBounds.width;
        const objBottom = objBounds.top + objBounds.height;
        
        // Vertical center alignment with other objects
        if (Math.abs(objectCenterX - objCenterX) < aligningLineMargin) {
          const line = drawVerticalLine({
            x: objCenterX,
            y1: Math.min(objectTop, objTop),
            y2: Math.max(objectBottom, objBottom),
          });
          if (line) verticalLinesRef.current.push(line);
          snapX = objCenterX - objectBounds.width / 2;
        }
        
        // Horizontal center alignment with other objects
        if (Math.abs(objectCenterY - objCenterY) < aligningLineMargin) {
          const line = drawHorizontalLine({
            x1: Math.min(objectLeft, objLeft),
            x2: Math.max(objectRight, objRight),
            y: objCenterY,
          });
          if (line) horizontalLinesRef.current.push(line);
          snapY = objCenterY - objectBounds.height / 2;
        }
        
        // Left edge alignment with other objects
        if (Math.abs(objectLeft - objLeft) < aligningLineMargin) {
          const line = drawVerticalLine({
            x: objLeft,
            y1: Math.min(objectTop, objTop),
            y2: Math.max(objectBottom, objBottom),
          });
          if (line) verticalLinesRef.current.push(line);
          snapX = objLeft;
        }
        
        // Right edge alignment with other objects
        if (Math.abs(objectRight - objRight) < aligningLineMargin) {
          const line = drawVerticalLine({
            x: objRight,
            y1: Math.min(objectTop, objTop),
            y2: Math.max(objectBottom, objBottom),
          });
          if (line) verticalLinesRef.current.push(line);
          snapX = objRight - objectBounds.width;
        }
        
        // Top edge alignment with other objects
        if (Math.abs(objectTop - objTop) < aligningLineMargin) {
          const line = drawHorizontalLine({
            x1: Math.min(objectLeft, objLeft),
            x2: Math.max(objectRight, objRight),
            y: objTop,
          });
          if (line) horizontalLinesRef.current.push(line);
          snapY = objTop;
        }
        
        // Bottom edge alignment with other objects
        if (Math.abs(objectBottom - objBottom) < aligningLineMargin) {
          const line = drawHorizontalLine({
            x1: Math.min(objectLeft, objLeft),
            x2: Math.max(objectRight, objRight),
            y: objBottom,
          });
          if (line) horizontalLinesRef.current.push(line);
          snapY = objBottom - objectBounds.height;
        }
      });
      
      // Apply snapping
      if (snapX !== null) {
        activeObject.set({ left: snapX });
      }
      if (snapY !== null) {
        activeObject.set({ top: snapY });
      }
      
      activeObject.setCoords();
    };
    
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
    
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('mouse:up', clearGuidelines);
    
    return () => {
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('mouse:up', clearGuidelines);
    };
  }, [clearGuidelines, drawVerticalLine, drawHorizontalLine]);

  return (
    <div ref={containerRef} className="relative overflow-auto bg-gray-100 flex items-center justify-center p-4">
      <div className="relative shadow-lg">
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas id="editor-canvas" />
      </div>
    </div>
  );
};
