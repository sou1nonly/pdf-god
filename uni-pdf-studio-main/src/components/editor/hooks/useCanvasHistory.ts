import { useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { HistoryDiff } from '../types/editorTypes';
import { logger } from '../utils/logger';

export const useCanvasHistory = (
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>,
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void
) => {
  const historyRef = useRef<HistoryDiff[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const lastFullSnapshotIndex = useRef<number>(0);
  const FULL_SNAPSHOT_INTERVAL = 20;
  const maxHistorySteps = 50;
  
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const startTime = performance.now();
    const currentIndex = historyIndexRef.current + 1;
    
    // Full snapshot every N actions or first action
    if (currentIndex % FULL_SNAPSHOT_INTERVAL === 0 || historyRef.current.length === 0) {
      const json = fabricCanvasRef.current.toJSON(['id']);
      // Remove background image from history to save memory
      delete json.backgroundImage;
      
      historyRef.current = historyRef.current.slice(0, currentIndex);
      historyRef.current.push({
        type: 'full',
        timestamp: Date.now(),
        fullState: json,
      });
      lastFullSnapshotIndex.current = currentIndex;
      
      logger.info('CanvasHistory', `Full snapshot saved at index ${currentIndex}`);
    } else {
      // Store minimal diff
      const objects = fabricCanvasRef.current.getObjects();
      const diff: HistoryDiff = {
        type: 'diff',
        timestamp: Date.now(),
        changes: objects.map(obj => ({
          action: 'modify',
          objectId: obj.get('id') || (obj as any).__uid__,
          data: {
            left: obj.left,
            top: obj.top,
            angle: obj.angle,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
          }
        }))
      };
      
      historyRef.current = historyRef.current.slice(0, currentIndex);
      historyRef.current.push(diff);
      
      logger.info('CanvasHistory', `Diff saved at index ${currentIndex}, ${diff.changes?.length} objects`);
    }
    
    historyIndexRef.current = currentIndex;
    
    // Limit total history
    if (historyRef.current.length > maxHistorySteps) {
      historyRef.current.shift();
      historyIndexRef.current--;
      lastFullSnapshotIndex.current--;
      logger.warn('CanvasHistory', 'History limit reached, removing oldest state');
    }
    
    onHistoryChange(
      historyIndexRef.current > 0,
      historyIndexRef.current < historyRef.current.length - 1
    );
    
    const saveTime = performance.now() - startTime;
    logger.perf('CanvasHistory', 'Save state', saveTime);
    
    // Log memory usage
    const historySize = JSON.stringify(historyRef.current).length / 1024;
    logger.info('CanvasHistory', `History size: ${historySize.toFixed(2)}KB, ${historyRef.current.length} states`);
  }, [fabricCanvasRef, onHistoryChange]);
  
  const undo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current <= 0) {
      logger.warn('CanvasHistory', 'Cannot undo: at beginning of history');
      return;
    }
    
    const startTime = performance.now();
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
      
      const undoTime = performance.now() - startTime;
      logger.perf('CanvasHistory', `Undo to index ${historyIndexRef.current}`, undoTime);
    });
  }, [fabricCanvasRef, onHistoryChange]);
  
  const redo = useCallback(() => {
    if (!fabricCanvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) {
      logger.warn('CanvasHistory', 'Cannot redo: at end of history');
      return;
    }
    
    const startTime = performance.now();
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current?.requestRenderAll();
      onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
      
      const redoTime = performance.now() - startTime;
      logger.perf('CanvasHistory', `Redo to index ${historyIndexRef.current}`, redoTime);
    });
  }, [fabricCanvasRef, onHistoryChange]);
  
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    lastFullSnapshotIndex.current = 0;
    logger.info('CanvasHistory', 'History cleared');
  }, []);
  
  return { saveState, undo, redo, clearHistory };
};
