import React, { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import type { DesignAnnotation } from '../types/hybridAnnotations';

// Access fabric from global window object (loaded via script tag in index.html)
declare global {
  interface Window {
    fabric: any;
  }
}

const getFabricFromWindow = () => {
  if (typeof window !== 'undefined' && window.fabric) {
    console.log('[FabricLayer] Found fabric on window:', {
      hasCanvas: !!window.fabric.Canvas,
      hasFabricClass: !!window.fabric.fabric,
      keys: Object.keys(window.fabric).slice(0, 10),
      fabricVersion: window.fabric.version,
      CanvasType: typeof window.fabric.Canvas,
    });
    
    // Try to log what Canvas actually is
    if (window.fabric.Canvas) {
      console.log('[FabricLayer] Canvas constructor:', window.fabric.Canvas);
      console.log('[FabricLayer] Canvas prototype keys:', Object.keys(window.fabric.Canvas.prototype).slice(0, 20));
    }
    
    return window.fabric;
  }
  console.log('[FabricLayer] No fabric found on window');
  return null;
};

/**
 * Fabric.js Layer Component
 * Handles Design Mode - Precise shapes, images, and layout tools
 */

export interface FabricTool {
  type: 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'image' | 'path';
  config?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

interface FabricLayerProps {
  width: number;
  height: number;
  activeTool: FabricTool | null;
  onObjectAdded?: (object: any) => void;
  onObjectModified?: (object: any) => void;
  onObjectRemoved?: (object: any) => void;
  onSelectionChanged?: (objects: any[]) => void;
  visible?: boolean;
  className?: string;
}

export function FabricLayer({
  width,
  height,
  activeTool,
  onObjectAdded,
  onObjectModified,
  onObjectRemoved,
  onSelectionChanged,
  visible = true,
  className = '',
}: FabricLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fabricReady, setFabricReady] = useState(false);
  const drawingObjectRef = useRef<any | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  // Check if Fabric.js is loaded from CDN
  useEffect(() => {
    const checkFabric = () => {
      const fabric = getFabricFromWindow();
      if (fabric && fabric.Canvas) {
        logger.info('FabricLayer', 'Fabric.js loaded from CDN', {
          version: fabric.version,
          hasCanvas: !!fabric.Canvas,
        });
        setFabricReady(true);
      } else {
        logger.warn('FabricLayer', 'Fabric.js not yet loaded, retrying...');
        setTimeout(checkFabric, 100);
      }
    };
    checkFabric();
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current || !fabricReady) return;

    const fabric = getFabricFromWindow();
    if (!fabric || !fabric.Canvas) {
      logger.error('FabricLayer', 'Fabric.js not available from window', {
        fabricExists: !!fabric,
        hasCanvas: !!(fabric && fabric.Canvas),
      });
      return;
    }

    logger.info('FabricLayer', 'Initializing Fabric.js canvas', { width, height });

    try {
      // Create canvas instance
      const canvasInstance = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: 'transparent',
        selection: activeTool?.type === 'select',
        renderOnAddRemove: true,
        enableRetinaScaling: true,
      });

      // Debug: Log what we got back
      console.log('[FabricLayer] Canvas created:', {
        type: typeof canvasInstance,
        constructor: canvasInstance?.constructor?.name,
        hasSetWidth: typeof canvasInstance?.setWidth,
        hasSetDimensions: typeof canvasInstance?.setDimensions,
        hasRenderAll: typeof canvasInstance?.renderAll,
        hasOn: typeof canvasInstance?.on,
        keys: canvasInstance ? Object.keys(canvasInstance).slice(0, 20) : [],
        proto: Object.getPrototypeOf(canvasInstance),
      });

      // Verify canvas was created properly
      if (!canvasInstance || typeof canvasInstance.renderAll !== 'function') {
        logger.error('FabricLayer', 'Canvas created but missing methods', {
          hasCanvas: !!canvasInstance,
          hasOn: typeof canvasInstance?.on,
          hasRenderAll: typeof canvasInstance?.renderAll,
          canvasType: typeof canvasInstance,
        });
        return;
      }

      fabricCanvasRef.current = canvasInstance;

      // Enable object controls
      if (fabric.Object) {
        fabric.Object.prototype.set({
          transparentCorners: false,
          borderColor: '#2563eb',
          cornerColor: '#2563eb',
          cornerSize: 8,
          cornerStyle: 'circle',
        });
      }

      logger.info('FabricLayer', 'Canvas initialized successfully', {
        hasOn: typeof canvasInstance.on === 'function',
        hasRenderAll: typeof canvasInstance.renderAll === 'function',
      });
    } catch (error) {
      logger.error('FabricLayer', 'Canvas initialization failed', { error });
    }

    return () => {
      if (fabricCanvasRef.current) {
        logger.info('FabricLayer', 'Disposing canvas');
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [fabricReady, width, height, activeTool]);

  // Update canvas size
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricReady) return;

    try {
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
      logger.info('FabricLayer', 'Canvas dimensions updated', { width, height });
    } catch (error) {
      logger.error('FabricLayer', 'Failed to update canvas dimensions', { error });
    }
  }, [width, height, fabricReady]);

  // Update selection mode based on active tool
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricReady) return;

    canvas.selection = activeTool?.type === 'select';
    canvas.defaultCursor = activeTool?.type === 'select' ? 'default' : 'crosshair';
    canvas.renderAll();
  }, [activeTool, fabricReady]);

  // Handle object events
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricReady) return;

    const handleObjectAdded = (e: any) => {
      if (e.target) {
        logger.info('FabricLayer', 'Object added', { type: e.target.type });
        onObjectAdded?.(e.target);
      }
    };

    const handleObjectModified = (e: any) => {
      if (e.target) {
        logger.info('FabricLayer', 'Object modified', { type: e.target.type });
        onObjectModified?.(e.target);
      }
    };

    const handleObjectRemoved = (e: any) => {
      if (e.target) {
        logger.info('FabricLayer', 'Object removed', { type: e.target.type });
        onObjectRemoved?.(e.target);
      }
    };

    const handleSelectionCreated = (e: any) => {
      const selected = canvas.getActiveObjects();
      logger.info('FabricLayer', 'Selection created', { count: selected.length });
      onSelectionChanged?.(selected);
    };

    const handleSelectionUpdated = (e: any) => {
      const selected = canvas.getActiveObjects();
      logger.info('FabricLayer', 'Selection updated', { count: selected.length });
      onSelectionChanged?.(selected);
    };

    const handleSelectionCleared = () => {
      logger.info('FabricLayer', 'Selection cleared');
      onSelectionChanged?.([]);
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionUpdated);
    canvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionUpdated);
      canvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [onObjectAdded, onObjectModified, onObjectRemoved, onSelectionChanged]);

  // Handle drawing mode
  const handleMouseDown = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !activeTool || activeTool.type === 'select' || !fabricReady) return;

    const fabric = getFabricFromWindow();
    if (!fabric) return;

    const pointer = canvas.getPointer(e.e);
    startPointRef.current = { x: pointer.x, y: pointer.y };
    setIsDrawing(true);

    const config = activeTool.config || {};

    switch (activeTool.type) {
      case 'rect': {
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: config.fill || 'rgba(59, 130, 246, 0.3)',
          stroke: config.stroke || '#3b82f6',
          strokeWidth: config.strokeWidth || 2,
          opacity: config.opacity || 1,
        });
        canvas.add(rect);
        drawingObjectRef.current = rect;
        break;
      }

      case 'circle': {
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: config.fill || 'rgba(239, 68, 68, 0.3)',
          stroke: config.stroke || '#ef4444',
          strokeWidth: config.strokeWidth || 2,
          opacity: config.opacity || 1,
        });
        canvas.add(circle);
        drawingObjectRef.current = circle;
        break;
      }

      case 'line':
      case 'arrow': {
        const points = [pointer.x, pointer.y, pointer.x, pointer.y];
        const line = new fabric.Line(points, {
          stroke: config.stroke || '#000000',
          strokeWidth: config.strokeWidth || 2,
          opacity: config.opacity || 1,
        });
        canvas.add(line);
        drawingObjectRef.current = line;
        break;
      }

      case 'text': {
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fill: config.fill || '#000000',
          fontSize: 20,
          fontFamily: 'Arial',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        setIsDrawing(false);
        drawingObjectRef.current = null;
        break;
      }

      case 'path': {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = config.stroke || '#000000';
        canvas.freeDrawingBrush.width = config.strokeWidth || 2;
        break;
      }
    }

    canvas.renderAll();
  }, [activeTool, fabricReady]);

  const handleMouseMove = useCallback((e: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isDrawing || !drawingObjectRef.current || !startPointRef.current || !fabricReady) return;

    const fabric = getFabricFromWindow();
    if (!fabric) return;

    const pointer = canvas.getPointer(e.e);
    const obj = drawingObjectRef.current;

    if (obj instanceof fabric.Rect) {
      const width = pointer.x - startPointRef.current.x;
      const height = pointer.y - startPointRef.current.y;
      obj.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width < 0 ? pointer.x : startPointRef.current.x,
        top: height < 0 ? pointer.y : startPointRef.current.y,
      });
    } else if (obj instanceof fabric.Circle) {
      const radius = Math.sqrt(
        Math.pow(pointer.x - startPointRef.current.x, 2) +
        Math.pow(pointer.y - startPointRef.current.y, 2)
      );
      obj.set({ radius });
    } else if (obj instanceof fabric.Line) {
      obj.set({
        x2: pointer.x,
        y2: pointer.y,
      });
    }

    canvas.renderAll();
  }, [isDrawing, fabricReady]);

  const handleMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (canvas.isDrawingMode) {
      canvas.isDrawingMode = false;
    }

    setIsDrawing(false);
    drawingObjectRef.current = null;
    startPointRef.current = null;
    canvas.renderAll();
  }, []);

  // Attach mouse event handlers
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricReady) return;

    // Verify canvas has event methods
    if (typeof canvas.on !== 'function') {
      logger.error('FabricLayer', 'Canvas missing event methods', {
        canvasType: typeof canvas,
        hasOn: typeof canvas.on,
      });
      return;
    }

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      if (canvas && typeof canvas.off === 'function') {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, fabricReady]);

  // Public API methods
  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  const clearAll = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
  }, []);

  const exportJSON = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;

    return canvas.toJSON();
  }, []);

  const loadJSON = useCallback((json: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.loadFromJSON(json, () => {
      canvas.renderAll();
      logger.info('FabricLayer', 'Loaded canvas from JSON');
    });
  }, []);

  // Expose methods via ref (if needed)
  React.useImperativeHandle(fabricCanvasRef, () => ({
    deleteSelected,
    clearAll,
    exportJSON,
    loadJSON,
    getCanvas: () => fabricCanvasRef.current,
  }));

  if (!visible) {
    return null;
  }

  if (!fabricReady) {
    return (
      <div 
        className={className}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width, 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)'
        }}
      >
        <p className="text-sm text-muted-foreground">Loading Fabric.js...</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}

export default FabricLayer;
