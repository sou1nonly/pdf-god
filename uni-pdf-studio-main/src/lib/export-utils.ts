import { PDFDocument, rgb, StandardFonts, degrees, LineCapStyle, LineJoinStyle } from 'pdf-lib';
import html2canvas from 'html2canvas';
import type { HydratedPage, TextBlock, ImageBlock } from '@/types/hydration';

// Drawing object type from canvas
interface DrawingObject {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  angle?: number;
  path?: any[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  radius?: number;
  points?: { x: number; y: number }[];
  src?: string; // For images - data URL or source
}

/**
 * Export to PDF with selectable text and vector shapes
 * This is the preferred export method for high-quality PDFs
 */
export async function exportToPdfVector(
  pages: HydratedPage[], 
  fileName: string,
  drawingObjects?: DrawingObject[][]
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  
  const fonts = { helvetica, helveticaBold, helveticaOblique, helveticaBoldOblique };
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pdfPage = pdfDoc.addPage([page.dims.width, page.dims.height]);
    const { width, height } = pdfPage.getSize();
    
    // Draw text blocks as selectable text
    for (const block of page.blocks) {
      if (block.type === 'text') {
        await drawTextBlock(pdfPage, block as TextBlock, width, height, fonts);
      } else if (block.type === 'image') {
        await drawImageBlock(pdfDoc, pdfPage, block as ImageBlock, width, height);
      }
    }
    
    // Draw vector shapes from canvas
    const pageDrawings = drawingObjects?.[i] || [];
    for (const obj of pageDrawings) {
      await drawVectorShape(pdfDoc, pdfPage, obj, width, height, fonts);
    }
  }
  
  // Generate and download
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper function to fetch image data as ArrayBuffer
 */
async function fetchImageAsArrayBuffer(src: string): Promise<ArrayBuffer | null> {
  try {
    if (src.startsWith('data:')) {
      // Handle data URL
      const response = await fetch(src);
      return await response.arrayBuffer();
    } else {
      // Handle regular URL
      const response = await fetch(src);
      return await response.arrayBuffer();
    }
  } catch (e) {
    console.error('Failed to fetch image:', e);
    return null;
  }
}

/**
 * Draw a vector shape from Fabric.js canvas object
 */
async function drawVectorShape(
  pdfDoc: any,
  pdfPage: any,
  obj: DrawingObject,
  pageWidth: number,
  pageHeight: number,
  fonts: { helvetica: any; helveticaBold: any; helveticaOblique: any; helveticaBoldOblique: any }
) {
  const strokeColor = parseColor(obj.stroke || '#000000');
  const fillColor = obj.fill && obj.fill !== 'transparent' ? parseColor(obj.fill) : null;
  const strokeWidth = obj.strokeWidth || 1;
  const opacity = obj.opacity || 1;
  
  // Convert coordinates (PDF Y is from bottom)
  const x = obj.left;
  const y = pageHeight - obj.top;
  
  switch (obj.type) {
    case 'rect':
      // Draw rectangle
      if (fillColor) {
        pdfPage.drawRectangle({
          x,
          y: y - (obj.height || 0),
          width: obj.width || 0,
          height: obj.height || 0,
          color: rgb(fillColor.r, fillColor.g, fillColor.b),
          opacity,
        });
      }
      pdfPage.drawRectangle({
        x,
        y: y - (obj.height || 0),
        width: obj.width || 0,
        height: obj.height || 0,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: strokeWidth,
        borderOpacity: opacity,
      });
      break;
      
    case 'circle':
    case 'ellipse':
      const radiusX = (obj.width || obj.radius || 0) / 2;
      const radiusY = (obj.height || obj.radius || 0) / 2;
      const centerX = x + radiusX;
      const centerY = y - radiusY;
      
      if (fillColor) {
        pdfPage.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: radiusX,
          yScale: radiusY,
          color: rgb(fillColor.r, fillColor.g, fillColor.b),
          opacity,
        });
      }
      pdfPage.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: radiusX,
        yScale: radiusY,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: strokeWidth,
        borderOpacity: opacity,
      });
      break;
      
    case 'line':
      if (obj.x1 !== undefined && obj.y1 !== undefined && obj.x2 !== undefined && obj.y2 !== undefined) {
        pdfPage.drawLine({
          start: { x: obj.x1, y: pageHeight - obj.y1 },
          end: { x: obj.x2, y: pageHeight - obj.y2 },
          thickness: strokeWidth,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity,
        });
      }
      break;
      
    case 'path':
      // Free-hand drawings - convert path data to lines
      if (obj.path && Array.isArray(obj.path)) {
        let lastX = x;
        let lastY = y;
        
        for (const segment of obj.path) {
          if (segment[0] === 'M') {
            lastX = x + segment[1];
            lastY = pageHeight - (obj.top + segment[2]);
          } else if (segment[0] === 'Q' || segment[0] === 'L') {
            // Quadratic curve or line - simplify to line
            const endIdx = segment[0] === 'Q' ? 3 : 1;
            const endX = x + segment[endIdx];
            const endY = pageHeight - (obj.top + segment[endIdx + 1]);
            
            pdfPage.drawLine({
              start: { x: lastX, y: lastY },
              end: { x: endX, y: endY },
              thickness: strokeWidth,
              color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
              opacity,
              lineCap: LineCapStyle.Round,
            });
            
            lastX = endX;
            lastY = endY;
          }
        }
      }
      break;
      
    case 'i-text':
    case 'text':
    case 'textbox':
      // Draw text annotation
      if (obj.text) {
        const fontSize = obj.fontSize || 14;
        pdfPage.drawText(obj.text, {
          x,
          y: y - fontSize,
          size: fontSize,
          font: fonts.helvetica,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity,
        });
      }
      break;
      
    case 'triangle':
    case 'polygon':
      // Draw polygon using lines
      if (obj.points && obj.points.length >= 3) {
        for (let i = 0; i < obj.points.length; i++) {
          const p1 = obj.points[i];
          const p2 = obj.points[(i + 1) % obj.points.length];
          
          pdfPage.drawLine({
            start: { x: x + p1.x, y: pageHeight - (obj.top + p1.y) },
            end: { x: x + p2.x, y: pageHeight - (obj.top + p2.y) },
            thickness: strokeWidth,
            color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
            opacity,
          });
        }
      }
      break;
      
    case 'image':
      // Draw embedded image from canvas
      if (obj.src && obj.width && obj.height) {
        try {
          // Fetch image data and embed in PDF
          const imageData = await fetchImageAsArrayBuffer(obj.src);
          if (imageData) {
            let embeddedImage;
            
            // Detect image type and embed accordingly
            if (obj.src.startsWith('data:image/png') || obj.src.includes('.png')) {
              embeddedImage = await pdfDoc.embedPng(imageData);
            } else {
              // Default to JPEG for other formats
              embeddedImage = await pdfDoc.embedJpg(imageData);
            }
            
            pdfPage.drawImage(embeddedImage, {
              x,
              y: y - obj.height,
              width: obj.width,
              height: obj.height,
              opacity,
              rotate: obj.angle ? degrees(obj.angle) : undefined,
            });
          }
        } catch (e) {
          console.error('Failed to embed image in PDF:', e);
        }
      }
      break;
  }
}

/**
 * Export edited pages by capturing the exact visual canvas using html2canvas
 * This preserves all drawings, annotations, and exact text styling
 * Uses maximum quality settings for best output
 */
export async function exportToPdfFromCanvas(
  pageElements: HTMLElement[], 
  fileName: string,
  originalDimensions: { width: number; height: number }[]
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  
  for (let i = 0; i < pageElements.length; i++) {
    const pageElement = pageElements[i];
    const dims = originalDimensions[i] || { width: 595, height: 842 };
    
    // Capture the page element as a canvas with MAXIMUM quality
    const canvas = await html2canvas(pageElement, {
      scale: 4, // Maximum quality (4x resolution)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 0, // No timeout for images
      removeContainer: true,
      windowWidth: pageElement.scrollWidth,
      windowHeight: pageElement.scrollHeight,
    });
    
    // Convert canvas to PNG with maximum quality
    const pngDataUrl = canvas.toDataURL('image/png', 1.0);
    const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
    
    // Embed image in PDF
    const pngImage = await pdfDoc.embedPng(pngBytes);
    
    // Create page with original PDF dimensions
    const pdfPage = pdfDoc.addPage([dims.width, dims.height]);
    
    // Draw the captured image to fill the page
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });
  }
  
  // Generate and download
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-quality snapshot export - captures pages as high-resolution images
 * Best for preserving exact visual appearance including all drawings, images, and annotations
 */
export async function exportToPdfHighQuality(
  pageElements: HTMLElement[], 
  fileName: string,
  originalDimensions: { width: number; height: number }[]
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  
  for (let i = 0; i < pageElements.length; i++) {
    const pageElement = pageElements[i];
    const dims = originalDimensions[i] || { width: 595, height: 842 };
    
    // Get the actual rendered size
    const rect = pageElement.getBoundingClientRect();
    const currentScale = rect.width / dims.width;
    
    // Use scale factor to get target DPI (300 DPI for print quality)
    // At 72 DPI base, we need ~4.17x scale for 300 DPI
    const targetScale = Math.max(4, Math.ceil(300 / 72));
    
    // Force Fabric.js canvases to render before capture
    const fabricCanvases = pageElement.querySelectorAll('canvas.upper-canvas');
    fabricCanvases.forEach((canvas) => {
      const fabricCanvas = (canvas as any)?.__fabric_canvas;
      if (fabricCanvas) {
        fabricCanvas.renderAll();
      }
    });
    
    // Small delay to ensure canvas is fully rendered
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Capture with high resolution
    const canvas = await html2canvas(pageElement, {
      scale: targetScale / currentScale, // Compensate for current zoom
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 0,
      removeContainer: true,
      foreignObjectRendering: false, // Better canvas element capture
      onclone: (clonedDoc, element) => {
        // Ensure images are visible in clone
        const images = element.querySelectorAll('img');
        images.forEach(img => {
          img.style.visibility = 'visible';
          img.style.opacity = '1';
        });
      }
    });
    
    // Convert to PNG with full quality
    const pngDataUrl = canvas.toDataURL('image/png', 1.0);
    const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
    
    // Embed image
    const pngImage = await pdfDoc.embedPng(pngBytes);
    
    // Create page with original dimensions
    const pdfPage = pdfDoc.addPage([dims.width, dims.height]);
    
    // Draw image to fill page
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });
  }
  
  // Save and download
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Legacy export - creates PDF from hydration data (text-based)
 * Use exportToPdfFromCanvas for visual fidelity with annotations
 */
export async function exportToPdf(pages: HydratedPage[], fileName: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  
  for (const page of pages) {
    // Create page with original dimensions
    const pdfPage = pdfDoc.addPage([page.dims.width, page.dims.height]);
    const { width, height } = pdfPage.getSize();
    
    // Process each block
    for (const block of page.blocks) {
      if (block.type === 'text') {
        await drawTextBlock(pdfPage, block as TextBlock, width, height, {
          helvetica,
          helveticaBold,
          helveticaOblique,
          helveticaBoldOblique
        });
      } else if (block.type === 'image') {
        await drawImageBlock(pdfDoc, pdfPage, block as ImageBlock, width, height);
      }
    }
  }
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  
  // Download the file - cast to ArrayBuffer to fix TypeScript error
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Draw a text block on a PDF page - matches canvas exactly
 */
async function drawTextBlock(
  pdfPage: any, 
  block: TextBlock, 
  pageWidth: number, 
  pageHeight: number,
  fonts: {
    helvetica: any;
    helveticaBold: any;
    helveticaOblique: any;
    helveticaBoldOblique: any;
  }
) {
  // Convert percentage box to absolute coordinates
  const [xPct, yPct, wPct, hPct] = block.box;
  const x = (xPct / 100) * pageWidth;
  const boxTop = (yPct / 100) * pageHeight;
  const boxWidth = (wPct / 100) * pageWidth;
  const boxHeight = (hPct / 100) * pageHeight;
  
  // PDF Y is from bottom, so convert
  const y = pageHeight - boxTop;
  
  // Strip HTML and get plain text
  const plainText = stripHtml(block.html);
  if (!plainText.trim()) return;
  
  // Select font based on styles
  const isBold = block.styles.fontWeight >= 600;
  const isItalic = block.styles.italic;
  
  let font = fonts.helvetica;
  if (isBold && isItalic) font = fonts.helveticaBoldOblique;
  else if (isBold) font = fonts.helveticaBold;
  else if (isItalic) font = fonts.helveticaOblique;
  
  // Parse color
  const color = parseColor(block.styles.color);
  
  // Use the EXACT font size from the block - no scaling
  const fontSize = block.styles.fontSize || 12;
  
  // Calculate line height
  const lineHeight = fontSize * 1.2;
  
  // Draw text with word wrapping - position matches canvas
  const lines = wrapText(plainText, font, fontSize, boxWidth - 4);
  
  // Start from top of box, accounting for font ascent
  let lineY = y - fontSize;
  
  for (const line of lines) {
    // Stop if we exceed the box height
    if (y - lineY > boxHeight) break;
    
    // Calculate x position based on alignment - match CSS text-align
    let lineX = x;
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    
    if (block.styles.align === 'center') {
      lineX = x + (boxWidth - lineWidth) / 2;
    } else if (block.styles.align === 'right') {
      lineX = x + boxWidth - lineWidth;
    } else {
      // Left align (default)
      lineX = x;
    }
    
    pdfPage.drawText(line, {
      x: lineX,
      y: lineY,
      size: fontSize,
      font: font,
      color: rgb(color.r, color.g, color.b),
    });
    
    lineY -= lineHeight;
  }
}

/**
 * Draw an image block on a PDF page
 */
async function drawImageBlock(
  pdfDoc: any,
  pdfPage: any, 
  block: ImageBlock, 
  pageWidth: number, 
  pageHeight: number
) {
  try {
    // Convert percentage box to absolute coordinates
    const [xPct, yPct, wPct, hPct] = block.box;
    const x = (xPct / 100) * pageWidth;
    const y = pageHeight - ((yPct / 100) * pageHeight) - ((hPct / 100) * pageHeight);
    const w = (wPct / 100) * pageWidth;
    const h = (hPct / 100) * pageHeight;
    
    // Convert blob to array buffer
    const arrayBuffer = await block.blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Embed image based on mime type
    let image;
    if (block.mimeType === 'image/png') {
      image = await pdfDoc.embedPng(uint8Array);
    } else {
      image = await pdfDoc.embedJpg(uint8Array);
    }
    
    // Draw image
    pdfPage.drawImage(image, {
      x,
      y,
      width: w,
      height: h,
    });
  } catch (err) {
    console.warn('Failed to embed image:', err);
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Parse color string to RGB values (0-1 range)
 */
function parseColor(colorStr: string): { r: number; g: number; b: number } {
  // Default to black
  let r = 0, g = 0, b = 0;
  
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
    }
  } else if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      r = parseInt(match[1]) / 255;
      g = parseInt(match[2]) / 255;
      b = parseInt(match[3]) / 255;
    }
  }
  
  return { r, g, b };
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
