import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface DocumentThumbnailProps {
    storagePath: string;
    className?: string;
}

export const DocumentThumbnail = ({ storagePath, className }: DocumentThumbnailProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const renderTaskRef = useRef<any>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                setLoading(true);
                setError(false);

                // 1. Get signed URL
                const { data, error: urlError } = await supabase.storage
                    .from('documents')
                    .createSignedUrl(storagePath, 3600); // 1 hour

                if (urlError || !data?.signedUrl) {
                    throw new Error("Failed to get URL");
                }

                if (!active) return;

                // 2. Load PDF
                const loadingTask = pdfjsLib.getDocument(data.signedUrl);
                const pdf = await loadingTask.promise;

                if (!active) return;

                // 3. Get first page
                const page = await pdf.getPage(1);

                if (!active) return;

                // 4. Render to canvas
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                if (!context) return;

                // Calculate scale to fill/fit width of 200px roughly?
                // Thumbnail is typically small (e.g. aspect-[3/4] in DocumentsList)
                // We'll render at reasonable quality (0.3 scale usually creates ~200-300px width for standard A4)
                const viewport = page.getViewport({ scale: 0.3 }); // Enough for thumbnail

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Cancel previous render if any
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                const renderContext: any = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;

                await renderTask.promise;

                if (active) setLoading(false);

            } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                    console.error("Thumbnail error:", err);
                    if (active) setError(true);
                }
            }
        };

        load();

        return () => {
            active = false;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [storagePath]);

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 ${className}`}>
                <FileText className="h-12 w-12 text-gray-300" />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-white ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <FileText className="h-8 w-8 text-gray-200 animate-pulse" />
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
            />
        </div>
    );
};
