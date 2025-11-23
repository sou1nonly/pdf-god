/// <reference lib="webworker" />

import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
import { 
  normalizeTextItemsToRuns, 
  groupRunsIntoLines, 
  detectColumns, 
  detectTables,
  groupLinesIntoParagraphs, 
  paragraphsToBlocks,
  analyzeFontStatistics
} from '../lib/hydration/cluster';
import { HydratedPage, ImageBlock, TextBlock, TableBlock } from '../types/hydration';

// --- POLYFILLS FOR PDF.JS IN WORKER ---
// PDF.js display layer relies on DOM APIs (document, window, HTMLCanvasElement)
// We must mock these to allow page.render() to work in a Web Worker.

if (typeof window === 'undefined') {
  (self as any).window = self;
}

if (typeof document === 'undefined') {
  (self as any).document = {
    createElement: (tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        const canvas = new OffscreenCanvas(1, 1);
        (canvas as any).style = { width: '1px', height: '1px' };
        (canvas as any).tagName = 'CANVAS';
        return canvas;
      }
      return { style: {}, tagName: tagName.toUpperCase() };
    },
    createElementNS: (ns: string, tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        const canvas = new OffscreenCanvas(1, 1);
        (canvas as any).style = { width: '1px', height: '1px' };
        (canvas as any).tagName = 'CANVAS';
        return canvas;
      }
      return { style: {}, tagName: tagName.toUpperCase() };
    },
    head: {
      appendChild: () => {}
    }
  };
}

if (typeof HTMLCanvasElement === 'undefined') {
  // PDF.js checks instanceof HTMLCanvasElement
  (self as any).HTMLCanvasElement = OffscreenCanvas;
}

if (typeof requestAnimationFrame === 'undefined') {
  (self as any).requestAnimationFrame = (callback: any) => setTimeout(callback, 0);
}
if (typeof cancelAnimationFrame === 'undefined') {
  (self as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}

// Configure worker
// In a Vite setup, we usually don't need to set GlobalWorkerOptions.workerSrc inside the worker itself
// if we are just using the API. However, if pdf.js needs to spawn sub-workers, it might matter.
// For now, we assume we are the worker and we just use the main thread API of pdf.js (which is weird but works in a worker context)
// Actually, pdfjsLib.getDocument works in a worker if we pass it data.

// Configure worker with nested worker to avoid public URL issues in Vite
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

// Polyfill for PDF.js rendering in Worker environment
// PDF.js expects a DOMCanvasFactory to create canvas elements
// In a worker, we need to use OffscreenCanvas
class OffscreenCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = new OffscreenCanvas(width, height);
    // PDF.js might try to access style or tagName
    (canvas as any).style = {
      width: `${width}px`,
      height: `${height}px`,
    };
    (canvas as any).tagName = 'CANVAS';
    (canvas as any).addEventListener = (type: string, listener: any) => {};
    (canvas as any).removeEventListener = (type: string, listener: any) => {};
    
    const context = canvas.getContext("2d");
    return {
      canvas,
      context,
      toBlob: async (callback: (blob: Blob | null) => void) => {
        const blob = await canvas.convertToBlob();
        callback(blob);
      },
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { fileBuffer } = event.data as { fileBuffer: ArrayBuffer };

  if (!fileBuffer) {
    self.postMessage({
      type: 'ERROR',
      error: 'No file buffer provided'
    });
    return;
  }

  console.log(`Worker received file buffer. Size: ${fileBuffer.byteLength} bytes`);

  if (fileBuffer.byteLength === 0) {
    self.postMessage({
      type: 'ERROR',
      error: 'File buffer is empty'
    });
    return;
  }

  try {
    // Load the document
    // Ensure we pass a Uint8Array to PDF.js to avoid any ArrayBuffer issues
    const data = new Uint8Array(fileBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ 
      data,
      // We might need to point to standard font data if we want to render, 
      // but for text extraction it's usually fine.
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/cmaps/',
      cMapPacked: true,
      // Force usage of the provided data
      disableAutoFetch: true,
      disableStream: true,
    });
    
    const pdf = await loadingTask.promise;
    const pages: HydratedPage[] = [];

    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      // --- HEURISTICS PIPELINE ---
      
      // 1. Normalize
      const runs = normalizeTextItemsToRuns(textContent.items, viewport);
      
      // 1.5 Analyze Font Statistics
      const stats = analyzeFontStatistics(runs);

      // 2. Group into lines
      const lines = groupRunsIntoLines(runs, stats);
      
      // 3. Detect columns
      const linesWithColumns = detectColumns(lines, viewport.width);

      // 3.5 Detect Tables
      const { tables, remainingLines } = detectTables(linesWithColumns, { width: viewport.width, height: viewport.height }, stats);
      
      // 4. Group into paragraphs
      const paragraphs = groupLinesIntoParagraphs(remainingLines, stats);
      
      // 5. Convert to blocks
      const textBlocks = paragraphsToBlocks(paragraphs, { width: viewport.width, height: viewport.height }, stats);
      
      // 6. Extract Images
      const imageBlocks: ImageBlock[] = [];
      try {
        const opList = await page.getOperatorList();
        const { OPS } = pdfjsLib;
        
        // Iterate through operators to find images
        for (let j = 0; j < opList.fnArray.length; j++) {
          const fn = opList.fnArray[j];
          const args = opList.argsArray[j];
          
          if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
            const imgName = args[0];
            
            // Find the transform matrix for this image
            // We need to look backwards for the last 'dependency' or 'transform'
            // But actually, the current transformation matrix (CTM) is what matters.
            // Tracking CTM manually is hard.
            // A simpler heuristic: 
            // Images are usually preceded by a 'transform' (OPS.transform) or 'cm' (OPS.concatenateMatrix)
            // Let's look for the nearest preceding transform
            
            let transform = [1, 0, 0, 1, 0, 0]; // Identity
            
            // Scan backwards for transform
            for (let k = j - 1; k >= 0; k--) {
              if (opList.fnArray[k] === OPS.transform) {
                transform = opList.argsArray[k];
                break;
              }
            }
            
            // Calculate bounding box from transform
            // Image space is 0..1 x 0..1
            // Transform maps it to user space
            // [scaleX, skewY, skewX, scaleY, translateX, translateY]
            
            // We need to project (0,0), (1,0), (0,1), (1,1) to find the bounds
            const p0 = { x: transform[4], y: transform[5] };
            const p1 = { x: transform[0] + transform[4], y: transform[1] + transform[5] };
            const p2 = { x: transform[2] + transform[4], y: transform[3] + transform[5] };
            const p3 = { x: transform[0] + transform[2] + transform[4], y: transform[1] + transform[3] + transform[5] };
            
            const xs = [p0.x, p1.x, p2.x, p3.x];
            const ys = [p0.y, p1.y, p2.y, p3.y];
            
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            // Convert to viewport coordinates (flip Y)
            // PDF Y is bottom-up, Viewport Y is top-down
            // We can use viewport.convertToViewportRectangle? No, that's for rects.
            // Let's manually flip.
            
            const x = minX;
            const y = viewport.viewBox[3] - maxY; // Flip Y
            const w = maxX - minX;
            const h = maxY - minY;
            
            // Convert to %
            const box: [number, number, number, number] = [
              (x / viewport.width) * 100,
              (y / viewport.height) * 100,
              (w / viewport.width) * 100,
              (h / viewport.height) * 100
            ];
            
            // Filter out tiny images (likely artifacts)
            if (w < 5 || h < 5) continue;

            // We don't have the image blob yet.
            // We will extract it from the rendered canvas later.
            imageBlocks.push({
              id: `img-${j}-${Date.now()}`,
              type: 'image',
              box,
              blob: new Blob(), // Placeholder, will fill later
              mimeType: 'image/png',
              rotation: 0
            });
          }
        }
      } catch (e) {
        console.warn('Error extracting images:', e);
      }

      // 7. Compute page stats
      const avgFontSize = runs.length > 0 
        ? runs.reduce((sum, r) => sum + r.fontSize, 0) / runs.length 
        : 0;

      // 8. Render Background & Extract Images
      let backgroundBlob: Blob | null = null;
      let finalImageBlocks: ImageBlock[] = []; // Images that are successfully extracted and valid

      try {
        // Create OffscreenCanvas
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Render PDF page to canvas
          await page.render({
            canvasContext: ctx,
            viewport,
            intent: 'print',
            canvasFactory: new OffscreenCanvasFactory() as any
          } as any).promise;

          // Extract Image Blobs
          // Filter out images that are empty or white
          
          for (const imgBlock of imageBlocks) {
            const [xPercent, yPercent, wPercent, hPercent] = imgBlock.box;
            const x = Math.floor((xPercent / 100) * viewport.width);
            const y = Math.floor((yPercent / 100) * viewport.height);
            const w = Math.ceil((wPercent / 100) * viewport.width);
            const h = Math.ceil((hPercent / 100) * viewport.height);
            
            if (w > 0 && h > 0) {
              try {
                const imgData = ctx.getImageData(x, y, w, h);
                
                // Check if image is empty/transparent/white
                let hasContent = false;
                const data = imgData.data;
                for (let k = 0; k < data.length; k += 4) {
                  const r = data[k];
                  const g = data[k+1];
                  const b = data[k+2];
                  const a = data[k+3];
                  
                  // If not transparent and not white
                  if (a > 0 && (r < 250 || g < 250 || b < 250)) {
                    hasContent = true;
                    break;
                  }
                }

                if (hasContent) {
                  const imgCanvas = new OffscreenCanvas(w, h);
                  const imgCtx = imgCanvas.getContext('2d');
                  if (imgCtx) {
                    imgCtx.putImageData(imgData, 0, 0);
                    const blob = await imgCanvas.convertToBlob({ type: 'image/png' });
                    imgBlock.blob = blob;
                    finalImageBlocks.push(imgBlock);
                  }
                }
              } catch (err) {
                console.warn('Failed to extract image blob', err);
              }
            }
          }
          
          // Erase text regions (Paint Separator)
          ctx.fillStyle = '#FFFFFF';
          
          // Erase standard text blocks
          textBlocks.forEach(block => {
            const [xPercent, yPercent, wPercent, hPercent] = block.box;
            const x = (xPercent / 100) * viewport.width;
            const y = (yPercent / 100) * viewport.height;
            const w = (wPercent / 100) * viewport.width;
            const h = (hPercent / 100) * viewport.height;
            
            const padding = 2;
            ctx.fillRect(x - padding, y - padding, w + (padding * 2), h + (padding * 2));
          });

          // Erase table content (Full Block Erasure)
          // We erase the entire table area to remove the original grid lines
          // The UI will render new borders
          tables.forEach(table => {
            const [xPercent, yPercent, wPercent, hPercent] = table.box;
            const x = (xPercent / 100) * viewport.width;
            const y = (yPercent / 100) * viewport.height;
            const w = (wPercent / 100) * viewport.width;
            const h = (hPercent / 100) * viewport.height;
            
            // Add padding to ensure we catch the outer borders
            const padding = 2;
            ctx.fillRect(x - padding, y - padding, w + (padding * 2), h + (padding * 2));
          });
          
          // Erase image regions from background
          finalImageBlocks.forEach(block => {
             const [xPercent, yPercent, wPercent, hPercent] = block.box;
            const x = (xPercent / 100) * viewport.width;
            const y = (yPercent / 100) * viewport.height;
            const w = (wPercent / 100) * viewport.width;
            const h = (hPercent / 100) * viewport.height;
            
            // No padding for images, exact cut
            ctx.fillRect(x, y, w, h);
          });

          // Convert to Blob
          backgroundBlob = await canvas.convertToBlob({ type: 'image/png' });
        }
      } catch (renderError) {
        console.error('Background render error:', renderError);
        // Continue without background if rendering fails
      }

      pages.push({
        pageIndex: i - 1,
        dims: { width: viewport.width, height: viewport.height },
        backgroundBlob,
        blocks: [...textBlocks, ...finalImageBlocks, ...tables],
        meta: {
          lineHeightEstimate: null, // TODO
          avgFontSize
        }
      });
      
      // Report progress
      self.postMessage({
        type: 'PROGRESS',
        progress: Math.round((i / pdf.numPages) * 100)
      });
    }

    // Done
    self.postMessage({
      type: 'COMPLETE',
      pages,
    });
    
  } catch (error) {
    console.error('Hydration worker error:', error);
    self.postMessage({
      type: 'ERROR',
      error: (error as Error).message || 'Unknown worker error',
    });
  }
};
