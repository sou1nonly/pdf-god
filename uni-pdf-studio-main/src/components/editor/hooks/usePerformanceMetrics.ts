import { useRef, useEffect } from 'react';
import { PerformanceMetrics } from '../types/editorTypes';
import { logger } from '../utils/logger';

export const usePerformanceMetrics = () => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
    totalRenderTime: 0,
  });
  
  const trackRender = (renderTime: number) => {
    metricsRef.current.renderCount++;
    metricsRef.current.lastRenderTime = renderTime;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.avgRenderTime = 
      metricsRef.current.totalRenderTime / metricsRef.current.renderCount;
    
    // Log every 60 renders
    if (metricsRef.current.renderCount % 60 === 0) {
      logger.metrics('Performance', {
        totalRenders: metricsRef.current.renderCount,
        avgRenderTime: metricsRef.current.avgRenderTime.toFixed(2) + 'ms',
        lastRenderTime: metricsRef.current.lastRenderTime.toFixed(2) + 'ms',
        estimatedFPS: (1000 / metricsRef.current.avgRenderTime).toFixed(1),
      });
    }
  };
  
  // Memory tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        const totalMB = memory.jsHeapSizeLimit / 1048576;
        logger.memory('Performance', usedMB, totalMB);
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return { trackRender, metrics: metricsRef.current };
};
