import { useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { logger } from '../utils/logger';

export const useTextLayer = (activeTool: string) => {
  const textLayerCacheRef = useRef<Map<number, DocumentFragment>>(new Map());
  const currentTextScaleRef = useRef<number>(100);
  
  const renderTextLayer = useCallback(async (
    page: any,
    currentPage: number,
    zoom: number,
    textLayerElement: HTMLDivElement | null
  ) => {
    if (!textLayerElement) return;
    
    const startTime = performance.now();
    const cacheKey = currentPage;
    
    // Check if we have cached version for this page at base zoom
    if (!textLayerCacheRef.current.has(cacheKey)) {
      logger.info('TextLayer', `Creating cache for page ${currentPage}`);
      
      // Generate text layer fragment (only once per page at base scale)
      const fragment = document.createDocumentFragment();
      const textContent = await page.getTextContent();
      
      logger.info('TextLayer', `Extracted ${textContent.items.length} text items`);
      
      // Base viewport at 100% zoom for caching
      const baseViewport = page.getViewport({ scale: 1, rotation: 0 });
      
      textContent.items.forEach((item: any) => {
        const textDiv = document.createElement('span');
        const tx = pdfjsLib.Util.transform(
          baseViewport.transform,
          item.transform
        );
        
        const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
        
        textDiv.style.position = 'absolute';
        textDiv.style.left = `${tx[4]}px`;
        textDiv.style.top = `${tx[5] - fontSize}px`;
        textDiv.style.fontSize = `${fontSize}px`;
        textDiv.style.fontFamily = item.fontName;
        textDiv.style.transform = `scaleX(${tx[0] / fontSize})`;
        textDiv.style.transformOrigin = '0 0';
        textDiv.textContent = item.str;
        textDiv.style.color = 'transparent';
        textDiv.style.whiteSpace = 'pre';
        textDiv.style.display = 'inline-block';
        textDiv.className = 'pdf-text-item';
        
        fragment.appendChild(textDiv);
      });
      
      textLayerCacheRef.current.set(cacheKey, fragment);
      
      const cacheTime = performance.now() - startTime;
      logger.perf('TextLayer', `Cache created for page ${currentPage}`, cacheTime);
    } else {
      logger.info('TextLayer', `Using cached text layer for page ${currentPage}`);
    }
    
    // Clear and apply cached fragment
    textLayerElement.innerHTML = '';
    const cachedFragment = textLayerCacheRef.current.get(cacheKey);
    
    if (cachedFragment) {
      const clonedFragment = cachedFragment.cloneNode(true) as DocumentFragment;
      textLayerElement.appendChild(clonedFragment);
      
      // Update pointer events based on active tool
      const textItems = textLayerElement.querySelectorAll('.pdf-text-item');
      textItems.forEach((item) => {
        (item as HTMLElement).style.pointerEvents = activeTool === 'select' ? 'auto' : 'none';
        (item as HTMLElement).style.cursor = activeTool === 'select' ? 'text' : 'default';
      });
      
      logger.info('TextLayer', `Applied ${textItems.length} text items, tool: ${activeTool}`);
    }
    
    // Apply zoom via CSS transform (instant!)
    const scale = zoom / 100;
    const viewport = page.getViewport({ scale: zoom / 100, rotation: 0 });
    
    textLayerElement.style.transform = `scale(${scale})`;
    textLayerElement.style.transformOrigin = '0 0';
    textLayerElement.style.width = `${viewport.width / scale}px`;
    textLayerElement.style.height = `${viewport.height / scale}px`;
    
    currentTextScaleRef.current = zoom;
    
    const totalTime = performance.now() - startTime;
    logger.perf('TextLayer', 'Render complete', totalTime);
    logger.info('TextLayer', `Zoom: ${zoom}%, Scale: ${scale.toFixed(2)}`);
  }, [activeTool]);
  
  const clearCache = useCallback((keepCount: number = 5) => {
    if (textLayerCacheRef.current.size > keepCount) {
      const keys = Array.from(textLayerCacheRef.current.keys());
      const sortedKeys = keys.sort((a, b) => b - a);
      const keysToRemove = sortedKeys.slice(keepCount);
      
      keysToRemove.forEach(key => {
        textLayerCacheRef.current.delete(key);
      });
      
      logger.info('TextLayer', `Cache trimmed: ${keysToRemove.length} pages removed, ${keepCount} kept`);
    }
  }, []);
  
  const clearAllCache = useCallback(() => {
    const size = textLayerCacheRef.current.size;
    textLayerCacheRef.current.clear();
    logger.info('TextLayer', `All cache cleared: ${size} pages removed`);
  }, []);
  
  return { renderTextLayer, clearCache, clearAllCache, cacheSize: textLayerCacheRef.current.size };
};
