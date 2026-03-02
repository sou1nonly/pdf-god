import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SemanticDocument } from '@/lib/semantic';
import { typstRenderer } from '@/lib/semantic';

// =========================================================================
// SVG Render Cache — avoids re-running WASM for identical source
// =========================================================================

interface CacheEntry {
    svg: string;
    dimensions: { width: number; height: number } | null;
}

const SVG_CACHE_MAX = 5;
const svgCache = new Map<string, CacheEntry>();

/** Simple string hash for cache keying */
function hashSource(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return '' + h;
}

function getCached(source: string): CacheEntry | undefined {
    return svgCache.get(hashSource(source));
}

function setCache(source: string, entry: CacheEntry) {
    const key = hashSource(source);
    // LRU eviction: delete oldest if over capacity
    if (svgCache.size >= SVG_CACHE_MAX && !svgCache.has(key)) {
        const firstKey = svgCache.keys().next().value;
        if (firstKey !== undefined) svgCache.delete(firstKey);
    }
    svgCache.set(key, entry);
}

// =========================================================================
// Component
// =========================================================================

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

    // Track which source we last rendered to avoid duplicate renders
    const lastRenderedSourceRef = useRef<string>('');

    const parseSvgDimensions = useCallback((svgContent: string) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgEl = svgDoc.querySelector('svg');
        if (svgEl) {
            const viewBox = svgEl.getAttribute('viewBox');
            const w = svgEl.getAttribute('width');
            const h = svgEl.getAttribute('height');
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/).map(Number);
                return { width: parts[2], height: parts[3] };
            } else if (w && h) {
                return { width: parseFloat(w), height: parseFloat(h) };
            }
        }
        return null;
    }, []);

    useEffect(() => {
        if (pageIndex !== 0) return;
        if (!document?.typstSource) return;

        const source = document.typstSource;

        // Skip if we already rendered this exact source
        if (lastRenderedSourceRef.current === source) return;

        // Check cache first
        const cached = getCached(source);
        if (cached) {
            console.log('[TypstPageView] Cache HIT — skipping WASM render');
            setSvgHtml(cached.svg);
            setSvgDimensions(cached.dimensions);
            lastRenderedSourceRef.current = source;
            renderCompleteRef.current?.();
            return;
        }

        let cancelled = false;

        const render = async () => {
            setIsRendering(true);
            setError(null);

            try {
                console.log('[TypstPageView] Cache MISS — rendering via WASM...');
                const svgContent = await typstRenderer.renderToSvg(document);

                if (!cancelled) {
                    const dims = parseSvgDimensions(svgContent);

                    // Store in cache
                    setCache(source, { svg: svgContent, dimensions: dims });

                    setSvgHtml(svgContent);
                    setSvgDimensions(dims);
                    lastRenderedSourceRef.current = source;
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
    }, [document.typstSource, pageIndex, parseSvgDimensions]);

    // Don't render anything for pages > 0 (SVG contains all pages)
    if (pageIndex !== 0) return null;

    // Use SVG's intrinsic dimensions, fall back to A4 (595.28 x 841.89 pt)
    const intrinsicWidth = svgDimensions?.width || 595.28;
    const intrinsicHeight = svgDimensions?.height || 841.89;
    const displayWidth = intrinsicWidth * scale;

    return (
        <div
            className={`relative ${className}`}
            style={{ width: `${displayWidth}px`, backgroundColor: '#fff' }}
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

            <style>{`
                .typst-svg-container svg {
                    width: ${displayWidth}px !important;
                    height: auto !important;
                    display: block;
                }
            `}</style>

            {/* Spinner — only when no stale SVG is available */}
            {isRendering && !svgHtml && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"
                    style={{ minHeight: `${intrinsicHeight * scale}px` }}
                >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {/* Show subtle overlay when re-rendering (stale SVG still visible) */}
            {isRendering && svgHtml && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-border/30">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                    <span className="text-[10px] text-muted-foreground font-medium">Updating…</span>
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
