import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { DrawingTool } from './DrawingCanvas';

// Access global fabric
declare const fabric: any;

// Type helpers for fabric objects
type FabricCanvas = any;
type FabricObject = any;
type FabricEvent = any;

// Layer interface
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

interface LayerCanvasProps {
  layerId: string;
  width: number;
  height: number;
  scale: number;
  isActive: boolean;
  isVisible: boolean;
  isLocked: boolean;
  zIndex: number;
  activeTool: DrawingTool;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
  onObjectsChange?: (layerId: string, objects: any[]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  initialObjects?: any[];
}

export interface LayerCanvasRef {
  getObjects: () => any[];
  loadObjects: (objects: any[]) => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  getCanvas: () => HTMLCanvasElement | null; // For export
  deleteSelected: () => void;
}

// Single Layer Canvas component - each layer is its own Fabric.js canvas
export const LayerCanvas = forwardRef<LayerCanvasRef, LayerCanvasProps>(({
  layerId,
  width,
  height,
  scale,
  isActive,
  isVisible,
  isLocked,
  zIndex,
  activeTool,
  strokeColor,
  strokeWidth,
  fillColor,
  opacity,
  onObjectsChange,
  onHistoryChange,
  initialObjects,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<FabricObject | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width * scale,
      height: height * scale,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
    });

    fabricRef.current = canvas;

    // Save initial state
    historyRef.current = [JSON.stringify(canvas.toJSON())];
    historyIndexRef.current = 0;

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Update canvas size when scale changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.setDimensions({
      width: width * scale,
      height: height * scale,
    });

    // Fix: Use Zoom mechanism to scale drawing context properly
    canvas.setZoom(scale);

    // No need to manually scale objects if we use setZoom
    canvas.renderAll();
  }, [width, height, scale]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || isUndoRedoRef.current) return;

    const json = JSON.stringify(canvas.toJSON());

    // Remove future states if we're not at the end
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }

    // Notify parent of history state
    onHistoryChange?.(
      historyIndexRef.current > 0,
      historyIndexRef.current < historyRef.current.length - 1
    );
  }, [onHistoryChange]);

  // Notify parent of object changes
  const notifyObjectsChange = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !onObjectsChange) return;

    const objects = canvas.toJSON().objects || [];
    onObjectsChange(layerId, objects);
  }, [layerId, onObjectsChange]);

  // Handle tool changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Always disable drawing mode first
    canvas.isDrawingMode = false;

    if (!isActive) {
      // Non-active layer: disable all interaction
      canvas.selection = false;
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      return;
    }

    if (isLocked) {
      // Locked layer: disable all interaction
      canvas.selection = false;
      canvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      return;
    }

    // Active and unlocked layer
    switch (activeTool) {
      case 'select':
        // SELECT: Click to select objects, drag to move them, resize handles appear
        // Double-click on text to edit
        canvas.selection = true;
        canvas.forEachObject(obj => {
          obj.selectable = true;
          obj.evented = true;
          // Ensure IText objects are editable
          if (obj.type === 'i-text' || obj.type === 'textbox') {
            obj.editable = true;
          }
        });
        break;

      case 'hand':
        // HAND/PAN: For panning the view - objects not selectable
        canvas.selection = false;
        canvas.forEachObject(obj => {
          obj.selectable = false;
          obj.evented = false;
        });
        break;

      case 'draw':
        // DRAW/PENCIL: Free-hand drawing with pencil brush
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        break;

      case 'eraser':
        // ERASER: Removes objects on click/drag - handled by separate useEffect
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.forEachObject(obj => {
          obj.selectable = false;
          obj.evented = false;
        });
        break;

      case 'highlight':
        // HIGHLIGHT: Yellow semi-transparent rectangle for highlighting text
        canvas.selection = false;
        canvas.forEachObject(obj => {
          obj.selectable = false;
          obj.evented = false;
        });
        break;

      case 'text':
      case 'rect':
      case 'circle':
      case 'line':
      case 'arrow':
      case 'note':
      case 'callout':
        // Shape tools: disable selection while drawing
        canvas.selection = false;
        canvas.forEachObject(obj => {
          obj.selectable = false;
          obj.evented = false;
        });
        break;

      case 'check':
      case 'cross':
      case 'stamp-approved':
      case 'stamp-draft':
      case 'stamp-confidential':
        // Stamp tools: click to place
        canvas.selection = false;
        canvas.forEachObject(obj => {
          obj.selectable = false;
          obj.evented = false;
        });
        break;

      default:
        canvas.selection = true;
        canvas.forEachObject(obj => {
          obj.selectable = true;
          obj.evented = true;
        });
    }

    canvas.renderAll();
  }, [isActive, isLocked, activeTool, strokeColor, strokeWidth]);

  // Handle double-click to edit text objects in select mode
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isActive || isLocked || activeTool !== 'select') return;

    const handleDoubleClick = (opt: FabricEvent) => {
      const target = opt.target;
      if (!target) return;

      // Check if it's an editable text object
      if (target.type === 'i-text' || target.type === 'textbox') {
        canvas.setActiveObject(target);
        target.enterEditing();
        // Position cursor at click location if possible
        if (opt.pointer && target.setSelectionStart) {
          const clickPos = target.getSelectionStartFromPointer(opt.e);
          if (clickPos !== undefined) {
            target.setSelectionStart(clickPos);
            target.setSelectionEnd(clickPos);
          }
        }
        canvas.renderAll();
      }
    };

    canvas.on('mouse:dblclick', handleDoubleClick);

    return () => {
      canvas.off('mouse:dblclick', handleDoubleClick);
    };
  }, [isActive, isLocked, activeTool]);

  // Update brush properties when they change
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;

    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = strokeWidth;
  }, [strokeColor, strokeWidth]);

  // Handle object modifications
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleModified = () => {
      saveToHistory();
      notifyObjectsChange();
    };

    const handlePathCreated = () => {
      saveToHistory();
      notifyObjectsChange();
    };

    const handleTextEditingExited = () => {
      // Save state when text editing is finished
      saveToHistory();
      notifyObjectsChange();
    };

    canvas.on('object:modified', handleModified);
    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);
    canvas.on('text:editing:exited', handleTextEditingExited);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
      canvas.off('text:editing:exited', handleTextEditingExited);
    };
  }, [saveToHistory, notifyObjectsChange]);

  // Eraser tool - delete objects under cursor while mouse is down
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isActive || isLocked || activeTool !== 'eraser') return;

    let isErasing = false;
    const eraserRadius = strokeWidth * 3; // Eraser size based on stroke width

    const getObjectsAtPoint = (x: number, y: number) => {
      const objects = canvas.getObjects();
      return objects.filter((obj: FabricObject) => {
        if (!obj.containsPoint) {
          // For objects without containsPoint, check bounding box
          const bound = obj.getBoundingRect();
          return x >= bound.left && x <= bound.left + bound.width &&
            y >= bound.top && y <= bound.top + bound.height;
        }
        return obj.containsPoint({ x, y });
      });
    };

    const eraseAtPoint = (x: number, y: number) => {
      // Check objects in a radius around the point
      const objects = canvas.getObjects();
      const toRemove: FabricObject[] = [];

      objects.forEach((obj: FabricObject) => {
        const bound = obj.getBoundingRect();
        const centerX = bound.left + bound.width / 2;
        const centerY = bound.top + bound.height / 2;

        // Check if any part of object is within eraser radius
        const objLeft = bound.left;
        const objRight = bound.left + bound.width;
        const objTop = bound.top;
        const objBottom = bound.top + bound.height;

        // Check if eraser circle intersects with object bounds
        const closestX = Math.max(objLeft, Math.min(x, objRight));
        const closestY = Math.max(objTop, Math.min(y, objBottom));
        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

        if (distance <= eraserRadius) {
          toRemove.push(obj);
        }
      });

      if (toRemove.length > 0) {
        toRemove.forEach(obj => canvas.remove(obj));
        canvas.renderAll();
        saveToHistory();
        notifyObjectsChange();
      }
    };

    const handleMouseDown = (opt: FabricEvent) => {
      if (!opt.pointer) return;
      isErasing = true;
      eraseAtPoint(opt.pointer.x, opt.pointer.y);
    };

    const handleMouseMove = (opt: FabricEvent) => {
      if (!isErasing || !opt.pointer) return;
      eraseAtPoint(opt.pointer.x, opt.pointer.y);
    };

    const handleMouseUp = () => {
      isErasing = false;
    };

    // Disable default drawing mode for eraser
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.forEachObject((obj: FabricObject) => {
      obj.selectable = false;
      obj.evented = false;
    });

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [isActive, isLocked, activeTool, strokeWidth, saveToHistory, notifyObjectsChange]);

  // Mouse handlers for all shape/annotation tools
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !isActive || isLocked) return;

    // Tools that need custom mouse handling
    const shapeTools = ['text', 'rect', 'circle', 'line', 'arrow', 'highlight', 'note', 'callout', 'check', 'cross', 'squiggly', 'stamp-approved', 'stamp-draft', 'stamp-confidential'];

    if (!shapeTools.includes(activeTool)) {
      return;
    }

    const handleMouseDown = (opt: FabricEvent) => {
      if (!opt.pointer) return;

      const x = opt.pointer.x;
      const y = opt.pointer.y;

      // For click-to-place tools (stamps, checks, notes)
      if (['check', 'cross', 'note', 'stamp-approved', 'stamp-draft', 'stamp-confidential'].includes(activeTool)) {
        let obj: FabricObject;

        switch (activeTool) {
          case 'check': {
            // GREEN CHECKMARK - click to place
            obj = new fabric.Text('✓', {
              left: x - 10,
              top: y - 12,
              fontSize: 24 * scale,
              fill: '#22c55e', // Green
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              selectable: true,
              evented: true,
            });
            break;
          }

          case 'cross': {
            // RED X MARK - click to place
            obj = new fabric.Text('✗', {
              left: x - 10,
              top: y - 12,
              fontSize: 24 * scale,
              fill: '#ef4444', // Red
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              selectable: true,
              evented: true,
            });
            break;
          }

          case 'note': {
            // STICKY NOTE - yellow background with text
            const noteWidth = 150 * scale;
            const noteHeight = 100 * scale;
            const bg = new fabric.Rect({
              left: 0,
              top: 0,
              width: noteWidth,
              height: noteHeight,
              fill: '#fef3c7', // Yellow
              stroke: '#f59e0b',
              strokeWidth: 1,
              rx: 4,
              ry: 4,
            });
            const text = new fabric.IText('Note...', {
              left: 8,
              top: 8,
              fontSize: 12 * scale,
              fill: '#78350f',
              fontFamily: 'Inter, sans-serif',
              width: noteWidth - 16,
            });
            obj = new fabric.Group([bg, text], {
              left: x,
              top: y,
              selectable: true,
              evented: true,
            });
            break;
          }

          case 'stamp-approved': {
            obj = new fabric.Text('APPROVED', {
              left: x,
              top: y,
              fontSize: 20 * scale,
              fill: '#22c55e',
              fontFamily: 'Arial Black, sans-serif',
              fontWeight: 'bold',
              stroke: '#22c55e',
              strokeWidth: 1,
              angle: -15,
              selectable: true,
              evented: true,
            });
            break;
          }

          case 'stamp-draft': {
            obj = new fabric.Text('DRAFT', {
              left: x,
              top: y,
              fontSize: 20 * scale,
              fill: '#f59e0b',
              fontFamily: 'Arial Black, sans-serif',
              fontWeight: 'bold',
              stroke: '#f59e0b',
              strokeWidth: 1,
              angle: -15,
              selectable: true,
              evented: true,
            });
            break;
          }

          case 'stamp-confidential': {
            obj = new fabric.Text('CONFIDENTIAL', {
              left: x,
              top: y,
              fontSize: 18 * scale,
              fill: '#ef4444',
              fontFamily: 'Arial Black, sans-serif',
              fontWeight: 'bold',
              stroke: '#ef4444',
              strokeWidth: 1,
              angle: -15,
              selectable: true,
              evented: true,
            });
            break;
          }

          default:
            return;
        }

        canvas.add(obj);
        canvas.renderAll();
        saveToHistory();
        notifyObjectsChange();
        return;
      }

      // For drag-to-draw tools
      isDrawingRef.current = true;
      startPointRef.current = { x, y };

      switch (activeTool) {
        case 'text': {
          // TEXT TOOL - click to place editable text
          const text = new fabric.IText('', {
            left: x,
            top: y,
            fontSize: 16 * scale,
            fill: strokeColor,
            fontFamily: 'Inter, sans-serif',
            editable: true,
            selectable: true,
            evented: true,
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          currentShapeRef.current = text;
          isDrawingRef.current = false;
          saveToHistory();
          notifyObjectsChange();
          break;
        }

        case 'rect': {
          // RECTANGLE - drag to draw
          const rect = new fabric.Rect({
            left: x,
            top: y,
            width: 0,
            height: 0,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            fill: fillColor === 'transparent' ? 'transparent' : fillColor,
            opacity: opacity,
            selectable: false,
            evented: false,
          });
          canvas.add(rect);
          currentShapeRef.current = rect;
          break;
        }

        case 'circle': {
          // ELLIPSE/CIRCLE - drag to draw
          const ellipse = new fabric.Ellipse({
            left: x,
            top: y,
            rx: 0,
            ry: 0,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            fill: fillColor === 'transparent' ? 'transparent' : fillColor,
            opacity: opacity,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });
          canvas.add(ellipse);
          currentShapeRef.current = ellipse;
          break;
        }

        case 'line': {
          // LINE - drag from start to end point
          const line = new fabric.Line([x, y, x, y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            opacity: opacity,
            selectable: false,
            evented: false,
          });
          canvas.add(line);
          currentShapeRef.current = line;
          break;
        }

        case 'arrow': {
          // ARROW - line with arrowhead
          const line = new fabric.Line([x, y, x, y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            opacity: opacity,
            selectable: false,
            evented: false,
          });
          canvas.add(line);
          currentShapeRef.current = line;
          break;
        }

        case 'highlight': {
          // HIGHLIGHTER - semi-transparent yellow/colored rectangle
          const highlight = new fabric.Rect({
            left: x,
            top: y,
            width: 0,
            height: 20 * scale, // Fixed height like a highlighter marker
            fill: strokeColor || '#ffff00',
            opacity: 0.35,
            selectable: false,
            evented: false,
          });
          canvas.add(highlight);
          currentShapeRef.current = highlight;
          break;
        }

        case 'squiggly': {
          // SQUIGGLY UNDERLINE - wavy line for marking errors
          // We'll create it on mouse up with the full width
          currentShapeRef.current = null;
          break;
        }

        case 'callout': {
          // CALLOUT - speech bubble with text
          const calloutWidth = 120 * scale;
          const calloutHeight = 60 * scale;

          // Bubble background
          const bubble = new fabric.Rect({
            left: 0,
            top: 0,
            width: calloutWidth,
            height: calloutHeight,
            fill: '#ffffff',
            stroke: strokeColor,
            strokeWidth: 2,
            rx: 8,
            ry: 8,
          });

          // Pointer triangle
          const pointer = new fabric.Triangle({
            left: 20,
            top: calloutHeight - 2,
            width: 20,
            height: 15,
            fill: '#ffffff',
            stroke: strokeColor,
            strokeWidth: 2,
            angle: 180,
          });

          // Text
          const text = new fabric.IText('Callout', {
            left: 10,
            top: 10,
            fontSize: 12 * scale,
            fill: strokeColor,
            fontFamily: 'Inter, sans-serif',
          });

          const group = new fabric.Group([bubble, pointer, text], {
            left: x,
            top: y,
            selectable: true,
            evented: true,
          });

          canvas.add(group);
          canvas.renderAll();
          saveToHistory();
          notifyObjectsChange();
          isDrawingRef.current = false;
          break;
        }
      }

      canvas.renderAll();
    };

    const handleMouseMove = (opt: FabricEvent) => {
      if (!isDrawingRef.current || !startPointRef.current || !opt.pointer || !currentShapeRef.current) return;

      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;
      const currentX = opt.pointer.x;
      const currentY = opt.pointer.y;

      switch (activeTool) {
        case 'rect': {
          const shape = currentShapeRef.current;
          shape.set({
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
          });
          break;
        }

        case 'highlight': {
          const shape = currentShapeRef.current;
          shape.set({
            left: Math.min(startX, currentX),
            top: startY - 10 * scale, // Center on the click point
            width: Math.abs(currentX - startX),
          });
          break;
        }

        case 'circle': {
          const ellipse = currentShapeRef.current;
          const rx = Math.abs(currentX - startX) / 2;
          const ry = Math.abs(currentY - startY) / 2;
          const centerX = (startX + currentX) / 2;
          const centerY = (startY + currentY) / 2;

          ellipse.set({ left: centerX, top: centerY, rx, ry });
          break;
        }

        case 'line':
        case 'arrow': {
          const line = currentShapeRef.current;
          line.set({ x2: currentX, y2: currentY });
          break;
        }

        case 'squiggly': {
          // Show preview - we'll draw the squiggly on mouse up
          break;
        }
      }

      canvas.renderAll();
    };

    const handleMouseUp = (opt: FabricEvent) => {
      if (!isDrawingRef.current) return;

      isDrawingRef.current = false;

      // Handle squiggly underline creation
      if (activeTool === 'squiggly' && startPointRef.current && opt.pointer) {
        const startX = startPointRef.current.x;
        const endX = opt.pointer.x;
        const y = startPointRef.current.y;
        const width = Math.abs(endX - startX);

        if (width > 5) {
          // Create wavy path
          const amplitude = 3 * scale;
          const wavelength = 8 * scale;
          let pathData = `M ${Math.min(startX, endX)} ${y}`;

          for (let x = 0; x < width; x += wavelength / 2) {
            const yOffset = (x / (wavelength / 2)) % 2 === 0 ? amplitude : -amplitude;
            pathData += ` Q ${Math.min(startX, endX) + x + wavelength / 4} ${y + yOffset} ${Math.min(startX, endX) + x + wavelength / 2} ${y}`;
          }

          const squiggly = new fabric.Path(pathData, {
            stroke: strokeColor || '#ef4444',
            strokeWidth: 2,
            fill: '',
            selectable: true,
            evented: true,
          });

          canvas.add(squiggly);
          canvas.renderAll();
          saveToHistory();
          notifyObjectsChange();
        }
      }

      if (currentShapeRef.current && activeTool !== 'text') {
        // Make the shape selectable after creation
        currentShapeRef.current.set({
          selectable: true,
          evented: true,
        });

        // Add arrowhead for arrow tool
        if (activeTool === 'arrow') {
          const line = currentShapeRef.current;
          const x1 = line.get('x1') || 0;
          const y1 = line.get('y1') || 0;
          const x2 = line.get('x2') || 0;
          const y2 = line.get('y2') || 0;

          // Only create arrow if line has some length
          if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLength = 12 * scale;

            const arrowHead = new fabric.Triangle({
              left: x2,
              top: y2,
              width: headLength,
              height: headLength,
              fill: strokeColor,
              angle: (angle * 180 / Math.PI) + 90,
              originX: 'center',
              originY: 'center',
            });

            // Group line and arrowhead
            const group = new fabric.Group([line, arrowHead], {
              selectable: true,
              evented: true,
            });

            canvas.remove(line);
            canvas.add(group);
            currentShapeRef.current = group;
          }
        }

        saveToHistory();
        notifyObjectsChange();
      }

      startPointRef.current = null;
      currentShapeRef.current = null;
      canvas.renderAll();
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [isActive, isLocked, activeTool, strokeColor, strokeWidth, fillColor, opacity, scale, saveToHistory, notifyObjectsChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getObjects: () => {
      const canvas = fabricRef.current;
      if (!canvas) return [];
      return canvas.toJSON().objects || [];
    },
    loadObjects: (objects: any[]) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      canvas.clear();
      if (objects && objects.length > 0) {
        fabric.util.enlivenObjects(objects, (enlivenedObjects: FabricObject[]) => {
          enlivenedObjects.forEach((obj: FabricObject) => canvas.add(obj));
          canvas.renderAll();
        }, 'fabric');
      }
    },
    clear: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      canvas.clear();
      saveToHistory();
      notifyObjectsChange();
    },
    undo: () => {
      const canvas = fabricRef.current;
      if (!canvas || historyIndexRef.current <= 0) return;

      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const state = historyRef.current[historyIndexRef.current];
      canvas.loadFromJSON(JSON.parse(state), () => {
        canvas.renderAll();
        isUndoRedoRef.current = false;
        notifyObjectsChange();
        onHistoryChange?.(
          historyIndexRef.current > 0,
          historyIndexRef.current < historyRef.current.length - 1
        );
      });
    },
    redo: () => {
      const canvas = fabricRef.current;
      if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const state = historyRef.current[historyIndexRef.current];
      canvas.loadFromJSON(JSON.parse(state), () => {
        canvas.renderAll();
        isUndoRedoRef.current = false;
        notifyObjectsChange();
        onHistoryChange?.(
          historyIndexRef.current > 0,
          historyIndexRef.current < historyRef.current.length - 1
        );
      });
    },
    getCanvas: () => {
      // Return the fabric canvas element for image export
      const canvas = fabricRef.current;
      if (!canvas) return null;
      // Use Fabric's toCanvasElement for proper rendering
      try {
        return canvas.toCanvasElement();
      } catch (e) {
        // Fallback to lower canvas
        return canvas.getElement();
      }
    },
    deleteSelected: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 0) {
        canvas.discardActiveObject();
        activeObjects.forEach((obj: FabricObject) => canvas.remove(obj));
        canvas.renderAll();
        saveToHistory();
        notifyObjectsChange();
      }
    },
  }), [saveToHistory, notifyObjectsChange]);

  // Calculate pointer events based on active state
  // CRITICAL: Only the active layer should receive pointer events
  // All other layers should let events pass through
  // In select mode with no objects, allow clicks to pass through to text blocks below
  const hasObjects = fabricRef.current?.getObjects()?.length > 0;

  // In select mode: only receive events if there are objects to select
  // In other modes: always receive events when active (to draw, erase, etc.)
  const shouldReceiveEvents = isActive && !isLocked && isVisible &&
    (activeTool !== 'select' || hasObjects);

  return (
    <div
      className="absolute inset-0"
      style={{
        zIndex,
        opacity: isVisible ? 1 : 0,
        pointerEvents: shouldReceiveEvents ? 'auto' : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
});

LayerCanvas.displayName = 'LayerCanvas';

// Layers Panel component for managing layers
interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onToggleVisibility,
  onToggleLock,
  onRenameLayer,
  onReorderLayer,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Sort layers by order (descending so highest order appears first)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

  const handleStartRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const handleFinishRename = (id: string) => {
    if (editName.trim()) {
      onRenameLayer(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="bg-white/95 backdrop-blur border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 p-3 min-w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-gray-600">Layers</span>
        <button
          onClick={onAddLayer}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
          title="Add Layer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Layer List */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {sortedLayers.map((layer, index) => {
          const isPdfContent = layer.id === 'pdf-content';
          const canDelete = !isPdfContent && layers.filter(l => l.id !== 'pdf-content').length > 1;

          return (
            <div
              key={layer.id}
              className={`
              flex items-center gap-1 p-1.5 rounded cursor-pointer transition-all
              ${activeLayerId === layer.id
                  ? 'bg-blue-50 border border-blue-300'
                  : 'hover:bg-gray-50 border border-transparent'}
            `}
              onClick={() => onSelectLayer(layer.id)}
            >
              {/* Layer Type Icon */}
              {isPdfContent ? (
                <div className="p-0.5 text-blue-500" title="PDF Content Layer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              ) : (
                <>
                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                    className={`p-0.5 rounded ${layer.visible ? 'text-gray-600' : 'text-gray-300'} hover:bg-gray-100`}
                    title={layer.visible ? 'Hide' : 'Show'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {layer.visible ? (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      ) : (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      )}
                    </svg>
                  </button>
                </>
              )}

              {/* Lock Toggle - not for PDF Content */}
              {!isPdfContent && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                  className={`p-0.5 rounded ${layer.locked ? 'text-amber-500' : 'text-gray-400'} hover:bg-gray-100`}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {layer.locked ? (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 019.9-1" />
                      </>
                    )}
                  </svg>
                </button>
              )}

              {/* Layer Name */}
              <div className="flex-1 min-w-0">
                {editingId === layer.id && !isPdfContent ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleFinishRename(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(layer.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full bg-white text-gray-800 text-xs px-1 py-0.5 rounded border border-blue-400 outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`text-xs truncate block ${isPdfContent ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    onDoubleClick={(e) => {
                      if (!isPdfContent) {
                        e.stopPropagation();
                        handleStartRename(layer);
                      }
                    }}
                  >
                    {layer.name}
                  </span>
                )}
              </div>

              {/* Reorder Buttons - not for PDF Content */}
              {!isPdfContent && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'up'); }}
                    className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Move Up"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'down'); }}
                    className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Move Down"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Delete Button - only for annotation layers that aren't the last one */}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                  className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                  title="Delete Layer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
