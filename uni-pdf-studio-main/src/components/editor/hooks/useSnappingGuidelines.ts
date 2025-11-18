import { useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { GuidelinePool } from '../types/editorTypes';
import { logger } from '../utils/logger';

export const useSnappingGuidelines = (fabricCanvasRef: React.RefObject<fabric.Canvas | null>) => {
  const guidelinePoolRef = useRef<GuidelinePool>({
    vertical: [],
    horizontal: [],
    initialized: false
  });
  
  const movingScheduledRef = useRef(false);
  const aligningLineMargin = 5;
  const aligningLineColor = 'rgb(0, 255, 0)';
  const aligningLineWidth = 1;
  
  const initGuidelinePool = useCallback(() => {
    if (!fabricCanvasRef.current || guidelinePoolRef.current.initialized) {
      logger.info('Snapping', 'Pool already initialized or canvas not ready');
      return;
    }
    
    const startTime = performance.now();
    const POOL_SIZE = 10;
    const canvas = fabricCanvasRef.current;
    
    // Create vertical lines
    for (let i = 0; i < POOL_SIZE; i++) {
      const line = new fabric.Line([0, 0, 0, 0], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
        visible: false,
      });
      canvas.add(line);
      guidelinePoolRef.current.vertical.push(line);
    }
    
    // Create horizontal lines
    for (let i = 0; i < POOL_SIZE; i++) {
      const line = new fabric.Line([0, 0, 0, 0], {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
        visible: false,
      });
      canvas.add(line);
      guidelinePoolRef.current.horizontal.push(line);
    }
    
    guidelinePoolRef.current.initialized = true;
    
    const initTime = performance.now() - startTime;
    logger.perf('Snapping', `Pool initialized with ${POOL_SIZE * 2} lines`, initTime);
  }, [fabricCanvasRef, aligningLineColor, aligningLineWidth]);
  
  const clearGuidelines = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const pool = guidelinePoolRef.current;
    let hiddenCount = 0;
    
    pool.vertical.forEach(line => {
      if (line.visible) hiddenCount++;
      line.set({ visible: false });
    });
    pool.horizontal.forEach(line => {
      if (line.visible) hiddenCount++;
      line.set({ visible: false });
    });
    
    if (hiddenCount > 0) {
      logger.info('Snapping', `${hiddenCount} guidelines hidden`);
    }
  }, [fabricCanvasRef]);
  
  const handleObjectMoving = useCallback((e: any, scheduleRender: () => void) => {
    if (movingScheduledRef.current) return;
    movingScheduledRef.current = true;
    
    requestAnimationFrame(() => {
      movingScheduledRef.current = false;
      
      const activeObject = e.target;
      if (!activeObject || !fabricCanvasRef.current) return;
      
      const startTime = performance.now();
      const canvas = fabricCanvasRef.current;
      const pool = guidelinePoolRef.current;
      
      // Hide all lines first
      clearGuidelines();
      
      let vLineIdx = 0;
      let hLineIdx = 0;
      
      const objectBounds = activeObject.getBoundingRect();
      const canvasWidth = canvas.width || 0;
      const canvasHeight = canvas.height || 0;
      
      let snapX: number | null = null;
      let snapY: number | null = null;
      
      const objectCenterX = objectBounds.left + objectBounds.width / 2;
      const objectCenterY = objectBounds.top + objectBounds.height / 2;
      
      // Canvas center snapping
      if (Math.abs(objectCenterX - canvasWidth / 2) < aligningLineMargin) {
        if (vLineIdx < pool.vertical.length) {
          pool.vertical[vLineIdx].set({
            x1: canvasWidth / 2, y1: 0,
            x2: canvasWidth / 2, y2: canvasHeight,
            visible: true
          });
          vLineIdx++;
        }
        snapX = canvasWidth / 2 - objectBounds.width / 2;
      }
      
      if (Math.abs(objectCenterY - canvasHeight / 2) < aligningLineMargin) {
        if (hLineIdx < pool.horizontal.length) {
          pool.horizontal[hLineIdx].set({
            x1: 0, y1: canvasHeight / 2,
            x2: canvasWidth, y2: canvasHeight / 2,
            visible: true
          });
          hLineIdx++;
        }
        snapY = canvasHeight / 2 - objectBounds.height / 2;
      }
      
      // Apply snapping
      if (snapX !== null) activeObject.set({ left: snapX });
      if (snapY !== null) activeObject.set({ top: snapY });
      
      activeObject.setCoords();
      scheduleRender();
      
      const snapTime = performance.now() - startTime;
      if (snapTime > 8) { // Log if slow
        logger.warn('Snapping', `Snap calculation took ${snapTime.toFixed(2)}ms (threshold: 8ms)`);
      }
    });
  }, [fabricCanvasRef, aligningLineMargin, clearGuidelines]);
  
  return {
    initGuidelinePool,
    clearGuidelines,
    handleObjectMoving,
  };
};
