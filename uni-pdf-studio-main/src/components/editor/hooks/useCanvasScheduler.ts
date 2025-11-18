import { useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { logger } from '../utils/logger';

export const useCanvasScheduler = (fabricCanvasRef: React.RefObject<fabric.Canvas | null>) => {
  const renderScheduledRef = useRef(false);
  const renderCountRef = useRef(0);
  
  const scheduleRender = useCallback(() => {
    if (renderScheduledRef.current) {
      logger.info('CanvasScheduler', 'Render already scheduled, skipping');
      return;
    }
    
    renderScheduledRef.current = true;
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      renderScheduledRef.current = false;
      
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.requestRenderAll();
        renderCountRef.current++;
        
        const renderTime = performance.now() - startTime;
        
        // Log every 60 renders
        if (renderCountRef.current % 60 === 0) {
          logger.perf('CanvasScheduler', `Render #${renderCountRef.current}`, renderTime);
        }
      }
    });
  }, [fabricCanvasRef]);
  
  return { scheduleRender };
};
