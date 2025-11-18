import { fabric } from 'fabric';
import { logger } from './logger';

export const setCanvasBackground = async (
  canvas: HTMLCanvasElement,
  fabricCanvas: fabric.Canvas,
  onComplete: () => void
): Promise<void> => {
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        logger.error('BlobConverter', 'Failed to create blob from canvas');
        return;
      }
      
      logger.info('BlobConverter', `Blob created: ${(blob.size / 1024).toFixed(2)}KB`);
      
      const url = URL.createObjectURL(blob);
      
      fabric.Image.fromURL(url, (img) => {
        img.set({ selectable: false, evented: false });
        fabricCanvas.setBackgroundImage(img, () => {
          onComplete();
          URL.revokeObjectURL(url);
          
          const totalTime = performance.now() - startTime;
          logger.perf('BlobConverter', 'Background set', totalTime);
          
          resolve();
        });
      }, { crossOrigin: 'anonymous' });
    }, 'image/png');
  });
};
