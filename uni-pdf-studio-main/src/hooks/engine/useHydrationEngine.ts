import { useState, useRef, useCallback, useEffect } from 'react';
import type { HydratedPage, ImageBlock } from '@/types/hydration';
import HydrationWorker from '@/workers/hydration.worker?worker';

type Status = 'idle' | 'processing' | 'complete' | 'error';

export type HydratedPageWithUrl = HydratedPage & { 
  backgroundUrl?: string;
  blocks: (HydratedPage['blocks'][0] & { imageUrl?: string })[];
};

export const useHydrationEngine = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [pages, setPages] = useState<HydratedPageWithUrl[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const processFile = useCallback(async (file: File) => {
    setStatus('processing');
    setError(null);
    setProgress(0);

    // Terminate existing worker if any
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      // Create new worker using Vite's worker import syntax
      const worker = new HydrationWorker();
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent) => {
        const { type, pages: resultPages, error: workerError, progress: workerProgress } = event.data;
        
        if (type === 'COMPLETE') {
          // Create Object URLs for background blobs and image blocks
          const pagesWithUrls = (resultPages as HydratedPage[]).map(page => ({
            ...page,
            backgroundUrl: page.backgroundBlob ? URL.createObjectURL(page.backgroundBlob) : undefined,
            blocks: page.blocks.map(block => {
              if (block.type === 'image' && (block as ImageBlock).blob) {
                return {
                  ...block,
                  imageUrl: URL.createObjectURL((block as ImageBlock).blob)
                };
              }
              return block;
            })
          }));
          
          setPages(pagesWithUrls);
          setStatus('complete');
          setProgress(100);
          // Don't terminate immediately if we want to keep using it, 
          // but for one-off processing it's fine.
          // worker.terminate(); 
          // workerRef.current = null;
        } else if (type === 'ERROR') {
          setError(workerError);
          setStatus('error');
        } else if (type === 'PROGRESS') {
          setProgress(workerProgress);
        }
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        setError('Worker initialization failed');
        setStatus('error');
      };

      const buffer = await file.arrayBuffer();
      // Transfer buffer to worker
      worker.postMessage({ fileBuffer: buffer }, [buffer]);
      
    } catch (err) {
      console.error('Failed to start hydration:', err);
      setError(err instanceof Error ? err.message : 'Failed to start processing');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    // Revoke object URLs to avoid memory leaks
    if (pages) {
      pages.forEach(page => {
        if (page.backgroundUrl) {
          URL.revokeObjectURL(page.backgroundUrl);
        }
      });
    }
    setPages(null);
    setStatus('idle');
    setError(null);
    setProgress(0);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, [pages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pages) {
        pages.forEach(page => {
          if (page.backgroundUrl) {
            URL.revokeObjectURL(page.backgroundUrl);
          }
        });
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [pages]);

  return { processFile, pages, status, error, progress, reset };
};
