import React, { useEffect, useRef, useState } from 'react';
import type { SemanticDocument } from '@/lib/semantic';
import { typstRenderer } from '@/lib/semantic';

interface TypstPageViewProps {
    document: SemanticDocument;
    pageIndex: number;
    scale?: number;
    className?: string;
    onRenderComplete?: () => void;
}

export const TypstPageView: React.FC<TypstPageViewProps> = ({
    document,
    pageIndex,
    scale = 1.0,
    className = '',
    onRenderComplete,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [svgHtml, setSvgHtml] = useState<string | null>(null);
    const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number } | null>(null);
    const renderCompleteRef = useRef(onRenderComplete);
    renderCompleteRef.current = onRenderComplete;

    // Only render once (or when source actually changes), page 0 only
    useEffect(() => {
        if (pageIndex !== 0) return;
        if (!document?.typstSource) return;

        let cancelled = false;

        const render = async () => {
            setIsRendering(true);
            setError(null);

            try {
                const svgContent = await typstRenderer.renderToSvg(document);
                if (!cancelled) {
                    setSvgHtml(svgContent);

                    // Parse SVG to get intrinsic dimensions from viewBox or width/height
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                    const svgEl = svgDoc.querySelector('svg');
                    if (svgEl) {
                        const viewBox = svgEl.getAttribute('viewBox');
                        const w = svgEl.getAttribute('width');
                        const h = svgEl.getAttribute('height');

                        if (viewBox) {
                            const parts = viewBox.split(/[\s,]+/).map(Number);
                            setSvgDimensions({ width: parts[2], height: parts[3] });
                        } else if (w && h) {
                            setSvgDimensions({ width: parseFloat(w), height: parseFloat(h) });
                        }
                    }

                    renderCompleteRef.current?.();
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[TypstPageView] Render failed:', err);
                    setError(err instanceof Error ? err.message : 'Render failed');
                }
            } finally {
                if (!cancelled) setIsRendering(false);
            }
        };

        render();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [document.typstSource, pageIndex]);

    // Don't render anything for pages > 0 (SVG contains all pages)
    if (pageIndex !== 0) return null;

    // Use SVG's intrinsic dimensions, fall back to A4 (595.28 x 841.89 pt)
    const intrinsicWidth = svgDimensions?.width || 595.28;
    const intrinsicHeight = svgDimensions?.height || 841.89;

    // Scale the container to display size
    const displayWidth = intrinsicWidth * scale;

    return (
        <div
            className={`relative ${className}`}
            style={{
                width: `${displayWidth}px`,
                backgroundColor: '#fff',
            }}
        >
            {svgHtml && (
                <div
                    ref={containerRef}
                    className="typst-svg-container"
                    style={{
                        width: `${displayWidth}px`,
                        willChange: 'transform',
                        contain: 'content',
                        transform: 'translateZ(0)',
                    }}
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                />
            )}

            {/* Force SVG to fill container width */}
            <style>{`
                .typst-svg-container svg {
                    width: ${displayWidth}px !important;
                    height: auto !important;
                    display: block;
                }
            `}</style>

            {isRendering && !svgHtml && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"
                    style={{ minHeight: `${intrinsicHeight * scale}px` }}
                >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10 p-4 text-center">
                    <div className="text-red-600">
                        <p className="font-semibold">Rendering Error</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
