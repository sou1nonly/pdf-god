import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  Pencil,
  Circle,
  Square,
  Minus,
  ArrowRight,
  Type,
  Eraser,
  MousePointer2,
  Highlighter,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Layer } from "./MultiLayerCanvas";

// Cast icons to fix TS version mismatch
const icons = {
  Pencil: Pencil as any,
  Circle: Circle as any,
  Square: Square as any,
  Minus: Minus as any,
  ArrowRight: ArrowRight as any,
  Type: Type as any,
  Eraser: Eraser as any,
  MousePointer2: MousePointer2 as any,
  Highlighter: Highlighter as any,
  StickyNote: StickyNote as any,
  Trash2: Trash2 as any,
};

// Access global fabric
declare const fabric: any;

// Helper function to check if a point is inside a bounding rect
function isPointInRect(point: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }): boolean {
  return point.x >= rect.left && 
         point.x <= rect.left + rect.width && 
         point.y >= rect.top && 
         point.y <= rect.top + rect.height;
}

export type DrawingTool = 
  | 'select' 
  | 'draw' 
  | 'eraser'
  | 'line' 
  | 'arrow'
  | 'rect' 
  | 'circle' 
  | 'text'
  | 'highlight'
  | 'note'
  | 'squiggly'
  | 'check'
  | 'cross'
  | 'hand'
  | 'callout'
  | 'link'
  | 'signature'
  | 'stamp-approved'
  | 'stamp-draft'
  | 'stamp-confidential';

// Expose methods for parent components
export interface DrawingCanvasHandle {
  clearCanvas: () => void;
  deleteSelected: () => void;
  exportToJSON: () => any;
  getObjectsForExport: () => any[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getObjects: () => any[];
  hasUnsavedChanges: () => boolean;
  markAsSaved: () => void;
}

type DrawingCanvasProps = {
  width: number;
  height: number;
  scale: number;
  activeTool: DrawingTool;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity?: number;
  isActive?: boolean; // Controls whether canvas receives pointer events
  initialObjects?: any[]; // Fabric.js objects to load initially
  onToolChange: (tool: DrawingTool) => void;
  onObjectsChange?: (objects: any[]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  activeLayerId?: string;
  layers?: Layer[];
};

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas({
  width,
  height,
  scale,
  activeTool,
  strokeColor,
  strokeWidth,
  fillColor,
  opacity = 1,
  isActive = true,
  initialObjects,
  onToolChange,
  onObjectsChange,
  onHistoryChange,
  activeLayerId,
  layers,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const isDrawingShapeRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<any>(null);
  const initialObjectsLoadedRef = useRef(false);
  const activeLayerIdRef = useRef(activeLayerId);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);
  
  // Undo/Redo history state
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoingRef = useRef(false);
  const lastSavedStateRef = useRef<string>('');
  const MAX_HISTORY = 50;

  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    if (!fabricRef.current || isUndoRedoingRef.current) return;
    
    const json = JSON.stringify(fabricRef.current.toJSON());
    
    // Don't save if state hasn't changed
    if (historyRef.current[historyIndexRef.current] === json) return;
    
    // Remove any future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(json);
    historyIndexRef.current++;
    
    // Trim history if exceeds max
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    // Notify parent of history state change
    onHistoryChange?.(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
  }, [onHistoryChange]);

  // Undo function
  const undo = useCallback(() => {
    if (!fabricRef.current || historyIndexRef.current <= 0) return;
    
    isUndoRedoingRef.current = true;
    historyIndexRef.current--;
    
    const state = historyRef.current[historyIndexRef.current];
    fabricRef.current.loadFromJSON(JSON.parse(state), () => {
      // Make all loaded objects permanent
      fabricRef.current.getObjects().forEach((obj: any) => {
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
        });
      });
      fabricRef.current.renderAll();
      isUndoRedoingRef.current = false;
      
      // Notify parent
      onHistoryChange?.(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
      onObjectsChange?.(fabricRef.current.toJSON().objects);
    });
  }, [onHistoryChange, onObjectsChange]);

  // Redo function
  const redo = useCallback(() => {
    if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
    
    isUndoRedoingRef.current = true;
    historyIndexRef.current++;
    
    const state = historyRef.current[historyIndexRef.current];
    fabricRef.current.loadFromJSON(JSON.parse(state), () => {
      // Make all loaded objects permanent
      fabricRef.current.getObjects().forEach((obj: any) => {
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
        });
      });
      fabricRef.current.renderAll();
      isUndoRedoingRef.current = false;
      
      // Notify parent
      onHistoryChange?.(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
      onObjectsChange?.(fabricRef.current.toJSON().objects);
    });
  }, [onHistoryChange, onObjectsChange]);

  const canUndo = useCallback(() => historyIndexRef.current > 0, []);
  const canRedo = useCallback(() => historyIndexRef.current < historyRef.current.length - 1, []);
  
  const hasUnsavedChanges = useCallback(() => {
    if (!fabricRef.current) return false;
    const currentState = JSON.stringify(fabricRef.current.toJSON());
    return currentState !== lastSavedStateRef.current;
  }, []);
  
  const markAsSaved = useCallback(() => {
    if (!fabricRef.current) return;
    lastSavedStateRef.current = JSON.stringify(fabricRef.current.toJSON());
  }, []);
  
  const getObjects = useCallback(() => {
    if (!fabricRef.current) return [];
    return fabricRef.current.toJSON().objects;
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    // Register layerId as a custom property to be serialized
    fabric.Object.prototype.toObject = (function (toObject) {
      return function (this: any, propertiesToInclude?: string[]) {
        return toObject.call(this, [...(propertiesToInclude || []), 'layerId']);
      };
    })(fabric.Object.prototype.toObject);

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width * scale,
      height: height * scale,
      selection: false, // Disable selection globally - objects are permanent
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    
    // Save initial empty state to history
    const initialState = JSON.stringify(canvas.toJSON());
    historyRef.current = [initialState];
    historyIndexRef.current = 0;
    lastSavedStateRef.current = initialState;

    // Listen for object changes
    canvas.on('object:modified', () => {
      saveToHistory();
      if (onObjectsChange) {
        onObjectsChange(canvas.toJSON().objects);
      }
    });

    canvas.on('object:added', (e: any) => {
      // Assign layer ID if not present
      if (e.target && !e.target.layerId && activeLayerIdRef.current) {
        e.target.set('layerId', activeLayerIdRef.current);
      }

      // Make all newly added objects permanent and non-editable
      if (e.target && !isUndoRedoingRef.current) {
        e.target.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
        });
      }
      if (!isUndoRedoingRef.current) {
        saveToHistory();
      }
      if (onObjectsChange) {
        onObjectsChange(canvas.toJSON().objects);
      }
    });

    canvas.on('object:removed', () => {
      if (!isUndoRedoingRef.current) {
        saveToHistory();
      }
      if (onObjectsChange) {
        onObjectsChange(canvas.toJSON().objects);
      }
    });

    // Selection handlers are set up in a separate useEffect to properly manage state

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Load initial objects when they become available
  useEffect(() => {
    if (!fabricRef.current || !initialObjects || initialObjects.length === 0 || initialObjectsLoadedRef.current) return;
    
    const canvas = fabricRef.current;
    
    // Clear existing objects before loading
    canvas.clear();
    
    // Load the saved objects
    canvas.loadFromJSON({ objects: initialObjects }, () => {
      // Make all loaded objects permanent and non-editable
      canvas.getObjects().forEach((obj: any) => {
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
        });
      });
      canvas.renderAll();
      initialObjectsLoadedRef.current = true;
      
      // Reset history with loaded state as the base
      const loadedState = JSON.stringify(canvas.toJSON());
      historyRef.current = [loadedState];
      historyIndexRef.current = 0;
      lastSavedStateRef.current = loadedState;
      onHistoryChange?.(false, false);
      
      console.log(`Loaded ${initialObjects.length} annotation objects (locked)`);
    });
  }, [initialObjects, onHistoryChange]);

  // Update canvas dimensions when scale changes
  useEffect(() => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    canvas.setWidth(width * scale);
    canvas.setHeight(height * scale);
    canvas.setZoom(scale);
    canvas.renderAll();
  }, [width, height, scale]);

  // Update tool settings
  useEffect(() => {
    if (!fabricRef.current) return;

    const canvas = fabricRef.current;

    // Check if active layer is locked
    const activeLayer = layers?.find((l: Layer) => l.id === activeLayerIdRef.current);
    const isLayerLocked = activeLayer?.locked ?? false;

    // Reset drawing mode
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'default';

    // If layer is locked, show disabled cursor for drawing tools
    if (isLayerLocked && activeTool !== 'select' && activeTool !== 'hand') {
      canvas.defaultCursor = 'not-allowed';
      canvas.hoverCursor = 'not-allowed';
      return; // Don't enable any drawing tools on locked layer
    }

    // Handle Hand Tool (Pan)
    if (activeTool === 'hand') {
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      
      let isDragging = false;
      let lastPosX = 0;
      let lastPosY = 0;

      canvas.on('mouse:down', (opt: any) => {
        const evt = opt.e;
        isDragging = true;
        canvas.defaultCursor = 'grabbing';
        canvas.hoverCursor = 'grabbing';
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      });

      canvas.on('mouse:move', (opt: any) => {
        if (isDragging) {
          const e = opt.e;
          const vpt = canvas.viewportTransform;
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          canvas.requestRenderAll();
          lastPosX = e.clientX;
          lastPosY = e.clientY;
        }
      });

      canvas.on('mouse:up', () => {
        isDragging = false;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        canvas.setViewportTransform(canvas.viewportTransform);
      });
      return;
    }

    // Handle Stamp Tools
    if (activeTool.startsWith('stamp-')) {
      canvas.defaultCursor = 'copy';
      canvas.hoverCursor = 'copy';
      
      canvas.on('mouse:down', (opt: any) => {
        const pointer = canvas.getPointer(opt.e);
        const stampType = activeTool.replace('stamp-', '').toUpperCase();
        const color = stampType === 'APPROVED' ? 'green' : stampType === 'DRAFT' ? 'gray' : 'red';
        
        const text = new fabric.Text(stampType, {
          fontSize: 24,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: color,
          originX: 'center',
          originY: 'center',
        });
        
        const rect = new fabric.Rect({
          width: text.width + 20,
          height: text.height + 10,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 3,
          rx: 5,
          ry: 5,
          originX: 'center',
          originY: 'center',
        });
        
        const group = new fabric.Group([rect, text], {
          left: pointer.x,
          top: pointer.y,
          opacity: 0.8,
          angle: -15,
        });
        
        canvas.add(group);
        canvas.setActiveObject(group);
        
        // Reset to select tool after stamping
        if (onToolChange) onToolChange('select');
      });
      return;
    }

    // Handle Callout Tool
    if (activeTool === 'callout') {
      canvas.defaultCursor = 'crosshair';
      
      let isDown = false;
      let startPoint: { x: number, y: number } | null = null;
      let line: any = null;
      let text: any = null;
      let rect: any = null;

      canvas.on('mouse:down', (o: any) => {
        isDown = true;
        const pointer = canvas.getPointer(o.e);
        startPoint = { x: pointer.x, y: pointer.y };
        
        // Create arrow line
        line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor,
          strokeWidth: 2,
          selectable: false,
        });
        
        // Create text box background
        rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 40,
          fill: 'white',
          stroke: strokeColor,
          strokeWidth: 1,
          selectable: false,
        });
        
        // Create text
        text = new fabric.IText('Comment', {
          left: pointer.x + 5,
          top: pointer.y + 5,
          fontSize: 14,
          fill: strokeColor,
          selectable: false,
        });
        
        canvas.add(line, rect, text);
      });

      canvas.on('mouse:move', (o: any) => {
        if (!isDown) return;
        const pointer = canvas.getPointer(o.e);
        
        if (line) {
          line.set({ x2: pointer.x, y2: pointer.y });
        }
        if (rect) {
          rect.set({ left: pointer.x, top: pointer.y });
        }
        if (text) {
          text.set({ left: pointer.x + 5, top: pointer.y + 5 });
        }
        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        isDown = false;
        if (line && rect && text) {
          const group = new fabric.Group([line, rect, text], {
            selectable: true,
          });
          canvas.remove(line, rect, text);
          canvas.add(group);
          canvas.setActiveObject(group);
        }
        if (onToolChange) onToolChange('select');
      });
      return;
    }

    // Handle Link Tool
    if (activeTool === 'link') {
      canvas.defaultCursor = 'crosshair';
      let rect: any, isDown: boolean, origX: number, origY: number;

      canvas.on('mouse:down', (o: any) => {
        isDown = true;
        const pointer = canvas.getPointer(o.e);
        origX = pointer.x;
        origY = pointer.y;
        
        rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: 'left',
          originY: 'top',
          width: pointer.x - origX,
          height: pointer.y - origY,
          angle: 0,
          fill: 'rgba(59, 130, 246, 0.2)', // Light blue transparent
          stroke: '#3b82f6',
          strokeWidth: 1,
          transparentCorners: false,
        });
        canvas.add(rect);
      });

      canvas.on('mouse:move', (o: any) => {
        if (!isDown) return;
        const pointer = canvas.getPointer(o.e);
        
        if (origX > pointer.x) {
          rect.set({ left: Math.abs(pointer.x) });
        }
        if (origY > pointer.y) {
          rect.set({ top: Math.abs(pointer.y) });
        }
        
        rect.set({ width: Math.abs(origX - pointer.x) });
        rect.set({ height: Math.abs(origY - pointer.y) });
        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        isDown = false;
        const url = prompt('Enter URL for this link:', 'https://');
        if (url) {
          rect.set('linkUrl', url);
          rect.set('hoverCursor', 'pointer');
        } else {
          canvas.remove(rect);
        }
        if (onToolChange) onToolChange('select');
      });
      return;
    }

    // Handle Signature Tool (Placeholder for now - acts as pen)
    if (activeTool === 'signature') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = 'black';
      canvas.freeDrawingBrush.width = 2;
      return;
    }

    // Reset all objects to non-interactive (permanent)
    canvas.forEachObject((obj: any) => {
      // Enable link clicking in select mode
      if (activeTool === 'select' && obj.linkUrl) {
        obj.selectable = false;
        obj.evented = true;
        obj.hoverCursor = 'pointer';
        return;
      }

      obj.selectable = false;
      obj.evented = false;
      obj.hasControls = false;
      obj.hasBorders = false;
    });

    // Add click handler for links in select mode
    if (activeTool === 'select') {
      canvas.on('mouse:down', (o: any) => {
        if (o.target && o.target.linkUrl) {
          window.open(o.target.linkUrl, '_blank');
        }
      });
    }

    // Remove existing event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('path:created');

    // Re-add link click handler if we just removed it
    if (activeTool === 'select') {
      canvas.on('mouse:down', (o: any) => {
        if (o.target && o.target.linkUrl) {
          window.open(o.target.linkUrl, '_blank');
        }
      });
    }

    // Helper: Create arrow shape
    const createArrow = (x1: number, y1: number, x2: number, y2: number) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 15;
      const headAngle = Math.PI / 6;

      const line = new fabric.Line([x1, y1, x2, y2], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        opacity: opacity,
      });

      const head1 = new fabric.Line([
        x2,
        y2,
        x2 - headLength * Math.cos(angle - headAngle),
        y2 - headLength * Math.sin(angle - headAngle),
      ], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        opacity: opacity,
      });

      const head2 = new fabric.Line([
        x2,
        y2,
        x2 - headLength * Math.cos(angle + headAngle),
        y2 - headLength * Math.sin(angle + headAngle),
      ], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        opacity: opacity,
      });

      return new fabric.Group([line, head1, head2], {
        selectable: false,
        evented: false,
        opacity: opacity,
      });
    };

    // Helper: Create squiggly line
    const createSquigglyLine = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      // Wave parameters
      const amplitude = 5;
      const frequency = 10;
      const steps = Math.max(2, Math.floor(distance / frequency));
      
      let pathData = `M 0 0`;
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = t * distance;
        const y = Math.sin(t * Math.PI * 2 * (distance / 20)) * amplitude;
        pathData += ` L ${x} ${y}`;
      }
      
      const path = new fabric.Path(pathData, {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: '',
        opacity: opacity,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'center',
      });

      // Rotate and position
      path.set({
        left: x1,
        top: y1,
        angle: (angle * 180) / Math.PI,
      });

      return path;
    };

    // Helper: Create check/cross stamp
    const createStamp = (type: 'check' | 'cross', x: number, y: number) => {
      const checkPath = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";
      const crossPath = "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
      
      const pathData = type === 'check' ? checkPath : crossPath;
      const color = type === 'check' ? '#22c55e' : '#ef4444'; // Green or Red default
      
      const path = new fabric.Path(pathData, {
        left: x,
        top: y,
        fill: color,
        stroke: '',
        scaleX: 2,
        scaleY: 2,
        originX: 'center',
        originY: 'center',
        selectable: true, // Allow moving stamps initially
        evented: true,
      });
      
      return path;
    };

    switch (activeTool) {
      case 'select':
        // Select mode - shapes/annotations are NOT selectable
        // Only IText objects can be selected for editing
        canvas.selection = false; // Disable group selection
        canvas.defaultCursor = 'default';
        canvas.forEachObject((obj: any) => {
          // Allow IText to be selectable for editing
          if (obj.type === 'i-text') {
            obj.selectable = true;
            obj.evented = true;
          } else {
            obj.selectable = false;
            obj.evented = false;
          }
        });
        canvas.renderAll();
        break;

      case 'draw':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.freeDrawingBrush.shadow = new fabric.Shadow({
          blur: 0,
          color: strokeColor,
        });
        // Lock drawings after they're made
        canvas.on('path:created', (e: any) => {
          if (e.path) {
            e.path.selectable = false;
            e.path.evented = false;
            e.path.lockMovementX = true;
            e.path.lockMovementY = true;
          }
        });
        break;

      case 'eraser':
        // Eraser mode - click/drag to remove objects at pointer location
        // Only erases from unlocked layers
        canvas.defaultCursor = 'crosshair';
        canvas.selection = false;
        canvas.forEachObject((obj: any) => {
          obj.evented = true; // Allow objects to receive events for eraser
        });
        
        let isErasing = false;
        
        const eraseAtPoint = (pointer: { x: number; y: number }) => {
          const objects = canvas.getObjects();
          for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            
            // Skip objects on locked layers
            const objLayerId = obj.layerId || activeLayerIdRef.current;
            const objLayer = layers?.find((l: Layer) => l.id === objLayerId);
            if (objLayer?.locked) continue;
            
            if (obj.containsPoint(pointer) || 
                (obj.getBoundingRect && isPointInRect(pointer, obj.getBoundingRect()))) {
              canvas.remove(obj);
              canvas.renderAll();
              break; // Remove one object per click
            }
          }
        };
        
        canvas.on('mouse:down', (o: any) => {
          isErasing = true;
          eraseAtPoint(canvas.getPointer(o.e));
        });
        
        canvas.on('mouse:move', (o: any) => {
          if (isErasing) {
            eraseAtPoint(canvas.getPointer(o.e));
          }
        });
        
        canvas.on('mouse:up', () => {
          isErasing = false;
        });
        break;

      case 'highlight':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth * 4;
        // Make it semi-transparent
        const highlightColor = fabric.Color.fromHex(strokeColor);
        highlightColor.setAlpha(0.3);
        canvas.freeDrawingBrush.color = highlightColor.toRgba();
        // Lock highlights after they're made
        canvas.on('path:created', (e: any) => {
          if (e.path) {
            e.path.selectable = false;
            e.path.evented = false;
          }
        });
        break;

      case 'line':
      case 'arrow':
      case 'rect':
      case 'circle':
      case 'squiggly':
        canvas.defaultCursor = 'crosshair';
        canvas.selection = false;
        // Deselect any active objects
        canvas.discardActiveObject();
        canvas.renderAll();
        
        // Setup shape drawing inline
        canvas.on('mouse:down', (o: any) => {
          // Start drawing regardless of active object
          isDrawingShapeRef.current = true;
          const pointer = canvas.getPointer(o.e);
          startPointRef.current = { x: pointer.x, y: pointer.y };

          let shape: any;
          switch (activeTool) {
            case 'line':
              shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                opacity: opacity,
                selectable: false,
                evented: false,
              });
              break;

            case 'arrow':
              shape = createArrow(pointer.x, pointer.y, pointer.x, pointer.y);
              break;
            
            case 'squiggly':
              shape = createSquigglyLine(pointer.x, pointer.y, pointer.x, pointer.y);
              break;

            case 'rect':
              shape = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 0,
                height: 0,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                fill: fillColor === 'transparent' ? '' : fillColor,
                opacity: opacity,
                selectable: false,
                evented: false,
              });
              break;

            case 'circle':
              shape = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 0,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                fill: fillColor === 'transparent' ? '' : fillColor,
                opacity: opacity,
                selectable: false,
                evented: false,
              });
              break;
          }

          if (shape) {
            canvas.add(shape);
            currentShapeRef.current = shape;
          }
        });

        canvas.on('mouse:move', (o: any) => {
          if (!isDrawingShapeRef.current || !startPointRef.current || !currentShapeRef.current) return;

          const pointer = canvas.getPointer(o.e);
          const shape = currentShapeRef.current;
          const startX = startPointRef.current.x;
          const startY = startPointRef.current.y;

          switch (activeTool) {
            case 'line':
              shape.set({ x2: pointer.x, y2: pointer.y });
              break;

            case 'arrow':
              canvas.remove(shape);
              currentShapeRef.current = createArrow(startX, startY, pointer.x, pointer.y);
              canvas.add(currentShapeRef.current);
              break;

            case 'squiggly':
              canvas.remove(shape);
              currentShapeRef.current = createSquigglyLine(startX, startY, pointer.x, pointer.y);
              canvas.add(currentShapeRef.current);
              break;

            case 'rect':
              const width = Math.abs(pointer.x - startX);
              const height = Math.abs(pointer.y - startY);
              shape.set({
                left: Math.min(startX, pointer.x),
                top: Math.min(startY, pointer.y),
                width,
                height,
              });
              break;

            case 'circle':
              const radius = Math.sqrt(
                Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
              ) / 2;
              const centerX = (startX + pointer.x) / 2;
              const centerY = (startY + pointer.y) / 2;
              shape.set({
                left: centerX - radius,
                top: centerY - radius,
                radius,
              });
              break;
          }

          canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
          if (currentShapeRef.current) {
            currentShapeRef.current.setCoords();
            // Lock shape - non-movable, only erasable
            currentShapeRef.current.selectable = false;
            currentShapeRef.current.evented = false;
            currentShapeRef.current.lockMovementX = true;
            currentShapeRef.current.lockMovementY = true;
            currentShapeRef.current.lockRotation = true;
            currentShapeRef.current.lockScalingX = true;
            currentShapeRef.current.lockScalingY = true;
            currentShapeRef.current.hasControls = false;
            currentShapeRef.current.hasBorders = false;
          }
          isDrawingShapeRef.current = false;
          startPointRef.current = null;
          currentShapeRef.current = null;
        });
        break;

      case 'check':
      case 'cross':
        canvas.defaultCursor = 'pointer';
        canvas.selection = false;
        canvas.discardActiveObject();
        canvas.renderAll();
        
        canvas.on('mouse:down', (o: any) => {
          const pointer = canvas.getPointer(o.e);
          const stamp = createStamp(activeTool, pointer.x, pointer.y);
          
          // Lock stamp after placement
          stamp.selectable = false;
          stamp.evented = false;
          
          canvas.add(stamp);
          saveToHistory();
          if (onObjectsChange) {
            onObjectsChange(canvas.toJSON().objects);
          }
        });
        break;

      case 'text':
        canvas.defaultCursor = 'text';
        canvas.selection = false;
        // Deselect any active objects
        canvas.discardActiveObject();
        canvas.renderAll();
        
        canvas.on('mouse:down', (o: any) => {
          // Check if we clicked on an existing IText object
          const target = canvas.findTarget(o.e);
          if (target && target.type === 'i-text') {
            // Allow editing existing text
            canvas.setActiveObject(target);
            target.enterEditing();
            return;
          }
          
          const pointer = canvas.getPointer(o.e);
          const text = new fabric.IText('Type here...', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 16,
            fontFamily: 'Arial',
            fill: strokeColor,
            editable: true,
            selectable: true, // Text can be selected for editing
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
          
          // When text editing ends, lock movement but keep editable
          text.on('editing:exited', () => {
            text.lockMovementX = true;
            text.lockMovementY = true;
            text.lockRotation = true;
            text.lockScalingX = true;
            text.lockScalingY = true;
            text.hasControls = false;
            text.hasBorders = false;
            // Keep selectable true so user can click to edit again
          });
        });
        break;

      case 'note':
        canvas.defaultCursor = 'pointer';
        canvas.selection = false;
        // Deselect any active objects
        canvas.discardActiveObject();
        canvas.renderAll();
        
        canvas.on('mouse:down', (o: any) => {
          const pointer = canvas.getPointer(o.e);
          
          const noteWidth = 150;
          const noteHeight = 100;
          
          // Yellow sticky note background
          const rect = new fabric.Rect({
            width: noteWidth,
            height: noteHeight,
            fill: '#fff9c4',
            stroke: '#f9a825',
            strokeWidth: 1,
            rx: 3,
            ry: 3,
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.2)',
              blur: 5,
              offsetX: 2,
              offsetY: 2,
            }),
          });

          const text = new fabric.IText('Note...', {
            left: 10,
            top: 10,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: '#333',
            width: noteWidth - 20,
          });

          const group = new fabric.Group([rect, text], {
            left: pointer.x,
            top: pointer.y,
            subTargetCheck: true,
            // Make note non-selectable and non-movable after creation
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            hasControls: false,
            hasBorders: false,
          });

          canvas.add(group);
          canvas.renderAll();
        });
        break;
    }

    canvas.renderAll();
  }, [activeTool, strokeColor, strokeWidth, fillColor, opacity, layers]);

  // Handle Layer Updates
  useEffect(() => {
    if (!fabricRef.current || !layers) return;
    const canvas = fabricRef.current;
    
    // 1. Update visibility and locking
    canvas.getObjects().forEach((obj: any) => {
      const layer = layers.find(l => l.id === obj.layerId);
      if (layer) {
        obj.visible = layer.visible;
        
        if (layer.locked) {
          obj.selectable = false;
          obj.evented = false;
        } else if (activeTool === 'select') {
          // Only restore selectability if in select mode
          obj.selectable = true;
          obj.evented = true;
        }
      }
    });
    
    // 2. Sort objects by layer order
    const layerOrderMap = new Map(layers.map((l, index) => [l.id, index]));
    
    if (canvas._objects) {
       canvas._objects.sort((a: any, b: any) => {
         const orderA = layerOrderMap.get(a.layerId) ?? -1;
         const orderB = layerOrderMap.get(b.layerId) ?? -1;
         return orderA - orderB;
       });
    }
    
    canvas.renderAll();
  }, [layers, activeTool]);

  // Clear all objects
  const clearCanvas = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = 'transparent';
    fabricRef.current.renderAll();
  }, []);

  // Delete selected objects
  const deleteSelected = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj: any) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, []);

  // Export canvas as JSON
  const exportToJSON = useCallback(() => {
    if (!fabricRef.current) return null;
    return fabricRef.current.toJSON();
  }, []);

  // Export canvas as SVG string
  const exportToSVG = useCallback(() => {
    if (!fabricRef.current) return null;
    return fabricRef.current.toSVG();
  }, []);

  // Get all objects with their properties for PDF export
  const getObjectsForExport = useCallback(() => {
    if (!fabricRef.current) return [];
    const canvas = fabricRef.current;
    const objects = canvas.getObjects();
    
    return objects.map((obj: any) => {
      const baseObj = {
        type: obj.type,
        left: obj.left / scale,
        top: obj.top / scale,
        width: (obj.width || 0) * (obj.scaleX || 1) / scale,
        height: (obj.height || 0) * (obj.scaleY || 1) / scale,
        stroke: obj.stroke,
        strokeWidth: (obj.strokeWidth || 1) / scale,
        fill: obj.fill,
        opacity: obj.opacity || 1,
        angle: obj.angle || 0,
        // For paths/lines
        path: obj.path,
        x1: obj.x1 ? obj.x1 / scale : undefined,
        y1: obj.y1 ? obj.y1 / scale : undefined,
        x2: obj.x2 ? obj.x2 / scale : undefined,
        y2: obj.y2 ? obj.y2 / scale : undefined,
        // For text
        text: obj.text,
        fontSize: obj.fontSize ? obj.fontSize / scale : undefined,
        fontFamily: obj.fontFamily,
        // For circles
        radius: obj.radius ? obj.radius / scale : undefined,
        // For arrows
        points: obj.points?.map((p: any) => ({ x: p.x / scale, y: p.y / scale })),
      };
      
      return baseObj;
    });
  }, [scale]);

  // Import canvas from JSON  
  const importFromJSON = useCallback((json: any) => {
    if (!fabricRef.current) return;
    fabricRef.current.loadFromJSON(json, () => {
      fabricRef.current.renderAll();
    });
  }, []);

  // Expose methods via useImperativeHandle for parent component access
  useImperativeHandle(ref, () => ({
    clearCanvas,
    deleteSelected,
    exportToJSON,
    getObjectsForExport,
    undo,
    redo,
    canUndo,
    canRedo,
    getObjects,
    hasUnsavedChanges,
    markAsSaved,
  }), [clearCanvas, deleteSelected, exportToJSON, getObjectsForExport, undo, redo, canUndo, canRedo, getObjects, hasUnsavedChanges, markAsSaved]);

  // Also expose methods to window for legacy access
  useEffect(() => {
    (window as any).__drawingCanvas = {
      clearCanvas,
      deleteSelected,
      exportToJSON,
      getObjectsForExport,
      importFromJSON,
      undo,
      redo,
      canUndo,
      canRedo,
    };
  }, [clearCanvas, deleteSelected, exportToJSON, getObjectsForExport, importFromJSON, undo, redo, canUndo, canRedo]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return;
      
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const canvas = fabricRef.current;
        if (!canvas.getActiveObject()?.isEditing) {
          deleteSelected();
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        fabricRef.current.discardActiveObject();
        fabricRef.current.renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, undo, redo]);

  // Determine when canvas should capture events
  // In drawing/annotation mode: capture everything (z-index 30)
  // In select mode: allow clicks through to text (z-index 5, pointer-events: none)
  const isDrawingMode = activeTool !== 'select';
  const shouldCaptureEvents = isActive && isDrawingMode;

  return (
    <div 
      className="absolute inset-0" 
      style={{ 
        // Only high z-index when drawing, otherwise stay below text
        zIndex: shouldCaptureEvents ? 30 : 5,
        pointerEvents: shouldCaptureEvents ? 'auto' : 'none'
      }}
    >
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
});

// Tool button for toolbar
type ToolButtonProps = {
  tool: DrawingTool;
  activeTool: DrawingTool;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

export function ToolButton({ tool, activeTool, icon, label, onClick }: ToolButtonProps) {
  return (
    <button
      className={cn(
        "p-2 rounded-lg transition-colors flex items-center gap-2",
        activeTool === tool 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-gray-100 text-gray-600"
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="text-xs hidden sm:inline">{label}</span>
    </button>
  );
}

// Drawing toolbar component
type DrawingToolbarProps = {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  onClear: () => void;
  onDelete: () => void;
};

export function DrawingToolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fillColor,
  onFillColorChange,
  onClear,
  onDelete,
}: DrawingToolbarProps) {
  const tools: { tool: DrawingTool; icon: any; label: string }[] = [
    { tool: 'select', icon: MousePointer2, label: 'Select' },
    { tool: 'draw', icon: Pencil, label: 'Draw' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser' },
    { tool: 'line', icon: Minus, label: 'Line' },
    { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { tool: 'rect', icon: Square, label: 'Rectangle' },
    { tool: 'circle', icon: Circle, label: 'Circle' },
    { tool: 'text', icon: Type, label: 'Text' },
    { tool: 'highlight', icon: Highlighter, label: 'Highlight' },
    { tool: 'note', icon: StickyNote, label: 'Note' },
  ];

  const colors = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border">
      {/* Tool buttons */}
      <div className="flex items-center gap-1 border-r pr-2">
        {tools.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            className={cn(
              "p-2 rounded transition-colors",
              activeTool === tool 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-gray-100 text-gray-600"
            )}
            onClick={() => onToolChange(tool)}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1 border-r pr-2">
        {colors.map(color => (
          <button
            key={color}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
              strokeColor === color ? "border-primary ring-2 ring-primary/30" : "border-gray-300"
            )}
            style={{ backgroundColor: color }}
            onClick={() => onStrokeColorChange(color)}
          />
        ))}
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => onStrokeColorChange(e.target.value)}
          className="w-6 h-6 cursor-pointer"
        />
      </div>

      {/* Stroke width */}
      <div className="flex items-center gap-2 border-r pr-2">
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-20"
        />
        <span className="text-xs text-gray-500 w-6">{strokeWidth}px</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 rounded hover:bg-red-100 text-red-500"
          onClick={onDelete}
          title="Delete Selected"
        >
          <icons.Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
