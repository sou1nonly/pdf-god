/// <reference lib="webworker" />

import * as pdfjsLib from 'pdfjs-dist';
import { 
  normalizeTextItemsToRuns, 
  analyzePageLayout, 
  calculateGlobalStats 
} from '../lib/hydration/cluster';
import { semanticAnalyzer } from '../lib/ai/semantic-analyzer';
import { HydratedPage, ImageBlock } from '../types/hydration';

// Track if AI is available
let aiAvailable = false;

// --- POLYFILLS ---
if (typeof window === 'undefined') (self as any).window = self;
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
    head: { appendChild: () => {} }
  };
}
if (typeof HTMLCanvasElement === 'undefined') (self as any).HTMLCanvasElement = OffscreenCanvas;
if (typeof requestAnimationFrame === 'undefined') (self as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
if (typeof cancelAnimationFrame === 'undefined') (self as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

// Use jsdelivr CDN for PDF.js worker (has latest versions)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

class OffscreenCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    const canvas = new OffscreenCanvas(width, height);
    (canvas as any).style = { width: `${width}px`, height: `${height}px` };
    (canvas as any).tagName = 'CANVAS';
    (canvas as any).addEventListener = () => {};
    (canvas as any).removeEventListener = () => {};
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
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// Helper to extract Separators from OPS
async function extractSeparators(page: any, viewport: any) {
  const separators: any[] = [];
  try {
    const opList = await page.getOperatorList();
    const { OPS } = pdfjsLib;
    
    // Track State
    let currentX = 0, currentY = 0;
    
    // We only care about strokes (lines/rects)
    // Simplified: Find explicit rectangle/line ops
    
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === OPS.constructPath) {
        const ops = args[0];
        const vals = args[1];
        let valIdx = 0;
        let startX = 0, startY = 0;

        for (let j = 0; j < ops.length; j++) {
           const op = ops[j];
           if (op === OPS.moveTo) {
              startX = vals[valIdx++];
              startY = vals[valIdx++];
           } else if (op === OPS.lineTo) {
              const endX = vals[valIdx++];
              const endY = vals[valIdx++];
              
              // Is it horizontal or vertical?
              const isH = Math.abs(startY - endY) < 2;
              const isV = Math.abs(startX - endX) < 2;
              
              if (isH || isV) {
                // Convert to Viewport Coords
                // Note: We need the CTM (Current Transform Matrix) strictly speaking,
                // but usually constructPath args are in user space.
                
                // transform to viewport
                const p1 = viewport.convertToViewportPoint(startX, startY);
                const p2 = viewport.convertToViewportPoint(endX, endY);
                
                // Box
                const x = Math.min(p1[0], p2[0]);
                const y = Math.min(p1[1], p2[1]);
                const w = Math.abs(p1[0] - p2[0]) + 1; // min width 1
                const h = Math.abs(p1[1] - p2[1]) + 1;

                // Filter tiny noise
                if (isH && w > 50) {
                   separators.push({ type: 'line', box: [x, y, w, h], orientation: 'horizontal' });
                } else if (isV && h > 50) {
                   separators.push({ type: 'line', box: [x, y, w, h], orientation: 'vertical' });
                }
              }
              startX = endX; startY = endY;
           }
        }
      } else if (fn === OPS.rectangle) {
         const [x, y, w, h] = args;
         // Convert
         const p = viewport.convertToViewportRectangle([x, y, x+w, y+h]);
         const box = [p[0], p[1], p[2]-p[0], p[3]-p[1]]; // [x, y, w, h]
         
         // Only treat as separator if thin (line)
         if (box[2] < 5 && box[3] > 50) {
             separators.push({ type: 'line', box, orientation: 'vertical' });
         } else if (box[3] < 5 && box[2] > 50) {
             separators.push({ type: 'line', box, orientation: 'horizontal' });
         }
      }
    }
  } catch(e) { console.warn('Vector extraction failed', e); }
  return separators;
}

// Helper to extract images from PDF page by rendering to canvas
async function extractImages(page: any, viewport: any): Promise<ImageBlock[]> {
  const images: ImageBlock[] = [];
  
  try {
    const opList = await page.getOperatorList();
    const { OPS } = pdfjsLib;
    
    // Track transforms and image positions
    let transformStack: number[][] = [[viewport.transform[0], viewport.transform[1], viewport.transform[2], viewport.transform[3], viewport.transform[4], viewport.transform[5]]];
    let imageIndex = 0;
    const imagePositions: { name: string; transform: number[] }[] = [];
    
    // First pass: collect all image operations with their transforms
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];
      
      if (fn === OPS.save) {
        transformStack.push([...transformStack[transformStack.length - 1]]);
      } else if (fn === OPS.restore) {
        if (transformStack.length > 1) transformStack.pop();
      } else if (fn === OPS.transform) {
        // Store current transform
        const [a, b, c, d, e, f] = args;
        transformStack[transformStack.length - 1] = [a, b, c, d, e, f];
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        const imgName = args[0];
        imagePositions.push({
          name: typeof imgName === 'string' ? imgName : `inline-${imageIndex}`,
          transform: [...transformStack[transformStack.length - 1]]
        });
      }
    }
    
    console.log(`  🔍 Found ${imagePositions.length} image operations`);
    
    // Second pass: Extract each image
    for (const imgPos of imagePositions) {
      try {
        let imgObj: any = null;
        
        // Try to get from page objects
        if (imgPos.name.startsWith('inline-')) {
          // Inline images are harder - skip for now
          console.log(`  ⚠️ Skipping inline image: ${imgPos.name}`);
          continue;
        }
        
        // Get image object - it might be a promise
        try {
          imgObj = await new Promise((resolve, reject) => {
            page.objs.get(imgPos.name, (obj: any) => {
              if (obj) resolve(obj);
              else reject(new Error('Image not found'));
            });
          });
        } catch {
          // Try alternative method
          imgObj = page.objs._objs?.get(imgPos.name)?.data;
        }
        
        if (!imgObj) {
          console.log(`  ⚠️ Could not get image object: ${imgPos.name}`);
          continue;
        }
        
        const imgWidth = imgObj.width || 100;
        const imgHeight = imgObj.height || 100;
        
        console.log(`  📷 Processing image: ${imgPos.name} (${imgWidth}x${imgHeight})`);
        
        // Create canvas and render image
        const canvas = new OffscreenCanvas(imgWidth, imgHeight);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;
        
        let blob: Blob | null = null;
        
        // Check if it's already a bitmap or has bitmap property
        if (imgObj.bitmap) {
          ctx.drawImage(imgObj.bitmap, 0, 0);
          blob = await canvas.convertToBlob({ type: 'image/png' });
        } else if (imgObj.data) {
          // Raw pixel data
          const imageData = ctx.createImageData(imgWidth, imgHeight);
          const dataLen = imgObj.data.length;
          const pixelCount = imgWidth * imgHeight;
          
          if (dataLen === pixelCount * 4) {
            // RGBA
            imageData.data.set(imgObj.data);
          } else if (dataLen === pixelCount * 3) {
            // RGB -> RGBA
            for (let j = 0; j < pixelCount; j++) {
              imageData.data[j * 4] = imgObj.data[j * 3];
              imageData.data[j * 4 + 1] = imgObj.data[j * 3 + 1];
              imageData.data[j * 4 + 2] = imgObj.data[j * 3 + 2];
              imageData.data[j * 4 + 3] = 255;
            }
          } else if (dataLen === pixelCount) {
            // Grayscale
            for (let j = 0; j < pixelCount; j++) {
              const v = imgObj.data[j];
              imageData.data[j * 4] = v;
              imageData.data[j * 4 + 1] = v;
              imageData.data[j * 4 + 2] = v;
              imageData.data[j * 4 + 3] = 255;
            }
          } else {
            console.log(`  ⚠️ Unknown data format: ${dataLen} bytes for ${pixelCount} pixels`);
            continue;
          }
          
          ctx.putImageData(imageData, 0, 0);
          blob = await canvas.convertToBlob({ type: 'image/png' });
        } else if (imgObj instanceof ImageBitmap) {
          ctx.drawImage(imgObj, 0, 0);
          blob = await canvas.convertToBlob({ type: 'image/png' });
        } else {
          console.log(`  ⚠️ Unknown image format for: ${imgPos.name}`, Object.keys(imgObj));
          continue;
        }
        
        if (!blob || blob.size === 0) {
          console.log(`  ⚠️ Failed to create blob for: ${imgPos.name}`);
          continue;
        }
        
        // Calculate position from transform
        // Transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const [a, b, c, d, e, f] = imgPos.transform;
        
        // The transform scales the 1x1 unit square to the image dimensions
        // Position is at (e, f) in PDF coordinates
        const pdfX = e;
        const pdfY = f;
        const pdfWidth = Math.abs(a) || imgWidth;
        const pdfHeight = Math.abs(d) || imgHeight;
        
        // Convert to viewport coordinates
        const vpX = pdfX;
        const vpY = viewport.height - pdfY - pdfHeight; // Flip Y
        
        // Convert to percentages
        const xPercent = (vpX / viewport.width) * 100;
        const yPercent = (vpY / viewport.height) * 100;
        const wPercent = (pdfWidth / viewport.width) * 100;
        const hPercent = (pdfHeight / viewport.height) * 100;
        
        images.push({
          id: `img-${Date.now()}-${imageIndex}`,
          type: 'image',
          box: [
            Math.max(0, Math.min(100, xPercent)),
            Math.max(0, Math.min(100, yPercent)),
            Math.max(5, Math.min(100, wPercent)),
            Math.max(5, Math.min(100, hPercent))
          ],
          blob,
          mimeType: 'image/png',
          rotation: 0
        });
        
        console.log(`  ✅ Image ${imageIndex + 1}: ${imgPos.name} at [${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%] size [${wPercent.toFixed(1)}%x${hPercent.toFixed(1)}%]`);
        imageIndex++;
        
      } catch (imgErr) {
        console.warn(`  ⚠️ Error processing image ${imgPos.name}:`, imgErr);
      }
    }
  } catch (e) {
    console.warn('Image extraction failed:', e);
  }
  
  console.log(`  → ${images.length} images successfully extracted`);
  return images;
}

// Logging helper for detailed extraction info
function logExtractionStats(pageNum: number, stats: {
  textItems: number;
  runs: number;
  lines: number;
  paragraphs: number;
  blocks: number;
  images: number;
  separators: number;
}) {
  console.log(`\n📄 Page ${pageNum} Extraction Summary:`);
  console.log(`   ├─ Raw text items: ${stats.textItems}`);
  console.log(`   ├─ Normalized runs: ${stats.runs}`);
  console.log(`   ├─ Lines detected: ${stats.lines}`);
  console.log(`   ├─ Paragraphs grouped: ${stats.paragraphs}`);
  console.log(`   ├─ Text blocks created: ${stats.blocks}`);
  console.log(`   ├─ Images found: ${stats.images}`);
  console.log(`   └─ Separators (lines/rules): ${stats.separators}`);
}

self.onmessage = async (event: MessageEvent) => {
  const { fileBuffer } = event.data as { fileBuffer: ArrayBuffer };

  if (!fileBuffer || fileBuffer.byteLength === 0) {
    self.postMessage({ type: 'ERROR', error: 'File buffer empty' });
    return;
  }

  try {
    // Stage 1: Opening PDF
    self.postMessage({ type: 'STAGE', stage: 'opening', message: 'Opening PDF document...' });
    
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjsLib.getDocument({ 
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/cmaps/',
      cMapPacked: true,
      disableAutoFetch: true,
      disableStream: true,
    });
    
    const pdf = await loadingTask.promise;
    const pages: HydratedPage[] = [];

    // Stage 2: Global Analysis
    self.postMessage({ type: 'STAGE', stage: 'scanning', message: `Scanning ${pdf.numPages} pages for structure...` });
    self.postMessage({ type: 'PROGRESS', progress: 5 });
    
    const allPageRuns = [];
    const sampleLimit = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= sampleLimit; i++) {
       const page = await pdf.getPage(i);
       const viewport = page.getViewport({ scale: 1.0 });
       const textContent = await page.getTextContent();
       const runs = normalizeTextItemsToRuns(textContent.items, viewport);
       allPageRuns.push(runs);
    }
    const globalStats = calculateGlobalStats(allPageRuns);
    
    // Stage 3: AI Initialization
    self.postMessage({ type: 'STAGE', stage: 'ai-init', message: 'Loading AI models...' });
    self.postMessage({ type: 'PROGRESS', progress: 15 });
    
    try {
      await semanticAnalyzer.init();
      aiAvailable = true;
      self.postMessage({ type: 'STAGE', stage: 'ai-ready', message: 'AI models loaded successfully' });
    } catch (e) {
      aiAvailable = false;
      self.postMessage({ type: 'STAGE', stage: 'ai-skip', message: 'AI unavailable, using heuristics' });
      console.warn('AI Init failed, falling back to heuristics', e);
    }

    // Stage 4: Extracting Content
    self.postMessage({ type: 'STAGE', stage: 'extracting', message: 'Extracting text and layout...' });
    self.postMessage({ type: 'PROGRESS', progress: 20 });

    // --- PASS 2: HYDRATION ---
    for (let i = 1; i <= pdf.numPages; i++) {
      // Per-page progress message
      self.postMessage({ 
        type: 'STAGE', 
        stage: 'extracting-page', 
        message: `Extracting page ${i} of ${pdf.numPages}...`,
        pageNum: i,
        totalPages: pdf.numPages
      });
      
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      // Extract text runs
      const runs = normalizeTextItemsToRuns(textContent.items, viewport);
      
      // Extract Vectors (Separators/Lines)
      const separators = await extractSeparators(page, viewport);
      
      // Extract Images
      const images = await extractImages(page, viewport);

      // Analyze Layout with smart algorithm
      self.postMessage({ type: 'STAGE', stage: 'analyzing', message: `Analyzing layout for page ${i}...` });
      const textBlocks = analyzePageLayout(runs, separators, { width: viewport.width, height: viewport.height }, globalStats);
      
      // Add images to blocks
      let blocks: (typeof textBlocks[number] | ImageBlock)[] = [...textBlocks, ...images];
      
      // Log detailed extraction stats
      logExtractionStats(i, {
        textItems: textContent.items.length,
        runs: runs.length,
        lines: blocks.filter(b => b.type === 'text').length, // Approximate
        paragraphs: blocks.filter(b => b.type === 'text').length,
        blocks: blocks.filter(b => b.type === 'text').length,
        images: images.length,
        separators: separators.length
      });
      
      // Log individual blocks for debugging
      console.log(`\n📦 Blocks on Page ${i}:`);
      blocks.forEach((b, idx) => {
        if (b.type === 'text') {
          const preview = b.html?.substring(0, 50).replace(/\n/g, ' ') || '';
          console.log(`   [${idx}] 📝 Text: "${preview}${b.html && b.html.length > 50 ? '...' : ''}" @ [${b.box.map(n => n.toFixed(1)).join(', ')}]`);
        } else if (b.type === 'image') {
          const imgBlock = b as unknown as ImageBlock;
          console.log(`   [${idx}] 🖼️  Image: ${imgBlock.id} (${imgBlock.blob?.size || 0} bytes) @ [${b.box.map(n => n.toFixed(1)).join(', ')}]`);
        }
      });

      // AI Refinement (only if AI loaded successfully)
      if (aiAvailable && blocks.length > 0) {
        self.postMessage({ type: 'STAGE', stage: 'ai-processing', message: `AI refining page ${i}...` });
        try {
          const aiPromises = blocks.map(async (b) => {
            if (b.type === 'text' && b.html.length < 50) {
               const score = await semanticAnalyzer.getSimilarity(b.html, "Figure 1 description");
               if (score > 0.4) {
                  b.meta.isCaption = true;
                  b.styles.color = '#555555';
                  b.styles.fontSize = Math.min(b.styles.fontSize, 10);
                  b.styles.italic = true;
               }
            }
            return b;
          });
          blocks = await Promise.all(aiPromises);
        } catch (e) {
          console.warn('AI Refinement error:', e);
        }
      }

      // Build Page
      self.postMessage({ type: 'STAGE', stage: 'building', message: `Building editable page ${i}...` });

      pages.push({
        pageIndex: i - 1,
        dims: { width: viewport.width, height: viewport.height },
        backgroundBlob: null,
        blocks: blocks,
        meta: { 
          lineHeightEstimate: globalStats.dominantLineHeight, 
          avgFontSize: globalStats.dominantFontSize,
          grid: {
             columns: globalStats.masterGrid.columns,
             margins: globalStats.masterGrid.margins
          }
        }
      });
      
      // Progress: 20% for setup + 80% distributed across pages
      const pageProgress = 20 + Math.round((i / pdf.numPages) * 75);
      self.postMessage({ type: 'PROGRESS', progress: pageProgress });
    }

    // Stage 5: Complete
    self.postMessage({ type: 'STAGE', stage: 'complete', message: 'Document ready for editing!' });
    self.postMessage({ type: 'PROGRESS', progress: 100 });

    self.postMessage({ type: 'COMPLETE', pages });
    
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
