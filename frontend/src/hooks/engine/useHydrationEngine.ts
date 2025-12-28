import { useState, useRef, useCallback, useEffect } from 'react';
import type { HydratedPage, ImageBlock } from '@/types/hydration';
import HydrationWorker from '@/workers/hydration.worker?worker';

type Status = 'idle' | 'processing' | 'complete' | 'error';

export type ProcessingStage =
  | 'idle'
  | 'opening'
  | 'scanning'
  | 'ai-init'
  | 'ai-ready'
  | 'ai-skip'
  | 'extracting'
  | 'extracting-page'
  | 'analyzing'
  | 'ai-processing'
  | 'building'
  | 'complete';

export interface StageInfo {
  stage: ProcessingStage;
  message: string;
  pageNum?: number;
  totalPages?: number;
}

export type HydratedPageWithUrl = HydratedPage & {
  backgroundUrl?: string;
  blocks: (HydratedPage['blocks'][0] & { imageUrl?: string })[];
};

export const useHydrationEngine = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [pages, setPages] = useState<HydratedPageWithUrl[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageInfo, setStageInfo] = useState<StageInfo>({ stage: 'idle', message: '' });
  const workerRef = useRef<Worker | null>(null);

  const processFile = useCallback(async (file: File | Blob) => {
    setStatus('processing');
    setError(null);
    setProgress(0);
    setStageInfo({ stage: 'opening', message: 'Initializing...' });

    // Terminate existing worker if any
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      // Create new worker using Vite's worker import syntax
      const worker = new HydrationWorker();
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent) => {
        const { type, pages: resultPages, error: workerError, progress: workerProgress, stage, message, pageNum, totalPages } = event.data;

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
          setStageInfo({ stage: 'complete', message: 'Document ready for editing!' });
        } else if (type === 'ERROR') {
          setError(workerError);
          setStatus('error');
          setStageInfo({ stage: 'idle', message: workerError });
        } else if (type === 'PROGRESS') {
          setProgress(workerProgress);
        } else if (type === 'STAGE') {
          setStageInfo({ stage, message, pageNum, totalPages });
        }
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        setError('Worker initialization failed');
        setStatus('error');
        setStageInfo({ stage: 'idle', message: 'Worker failed to initialize' });
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

  const updateBlock = useCallback((pageIndex: number, blockId: string, newHtml: string) => {
    setPages(currentPages => {
      if (!currentPages) return null;

      return currentPages.map((page, idx) => {
        if (idx !== pageIndex) return page;

        return {
          ...page,
          blocks: page.blocks.map(block => {
            if (block.id === blockId && block.type === 'text') {
              return { ...block, html: newHtml };
            }
            return block;
          })
        };
      });
    });
  }, []);

  const moveBlock = useCallback((pageIndex: number, blockId: string, newBox: [number, number, number, number]) => {
    setPages(currentPages => {
      if (!currentPages) return null;

      return currentPages.map((page, idx) => {
        if (idx !== pageIndex) return page;

        return {
          ...page,
          blocks: page.blocks.map(block => {
            if (block.id === blockId) {
              return { ...block, box: newBox };
            }
            return block;
          })
        };
      });
    });
  }, []);

  const updateBlockStyles = useCallback((pageIndex: number, blockId: string, newStyles: Partial<any>) => {
    setPages(currentPages => {
      if (!currentPages) return null;

      return currentPages.map((page, idx) => {
        if (idx !== pageIndex) return page;

        return {
          ...page,
          blocks: page.blocks.map(block => {
            if (block.id === blockId && block.type === 'text') {
              return {
                ...block,
                styles: { ...block.styles, ...newStyles }
              };
            }
            return block;
          })
        };
      });
    });
  }, []);

  // Add a new text block at specified position (for text tool)
  const addTextBlock = useCallback((pageIndex: number, box: [number, number, number, number], customId?: string) => {
    setPages(currentPages => {
      if (!currentPages) return null;

      return currentPages.map((page, idx) => {
        if (idx !== pageIndex) return page;

        // Generate unique ID for new block
        const newBlockId = customId || `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newBlock = {
          id: newBlockId,
          type: 'text' as const,
          box: box,
          html: '<span>Type here...</span>',
          text: 'Type here...',
          styles: {
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            color: '#000000',
            align: 'left' as const,
            letterSpacing: 0,
            italic: false,
            underline: false,
            lineHeight: 1.4,
          },
          confidence: 1.0,
          meta: {
            isHeader: false,
            isListItem: false,
            isCaption: false,
            rotation: 0,
            lineHeightRatio: 1,
            columnIndex: 0,
            sourceRuns: 1,
          },
        };

        return {
          ...page,
          blocks: [...page.blocks, newBlock],
        };
      });
    });
  }, []);

  return { processFile, pages, status, error, progress, stageInfo, reset, updateBlock, moveBlock, updateBlockStyles, addTextBlock };
};
