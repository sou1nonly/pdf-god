/**
 * Typst Renderer Service
 * 
 * Uses the high-level $typst API from @myriaddreamin/typst.ts which handles
 * all WASM module management internally. We configure the WASM URLs upfront
 * then just call $typst.svg().
 */

import { $typst } from '@myriaddreamin/typst.ts';
import type { SemanticDocument } from './types';

// WASM binary URLs — must match the installed package version (0.7.0-rc2)
const COMPILER_WASM_URL = 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm';
const RENDERER_WASM_URL = 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0-rc2/pkg/typst_ts_renderer_bg.wasm';

// Configure WASM locations BEFORE any usage
// $typst lazily initializes — these must be set before first svg()/canvas() call
$typst.setCompilerInitOptions({
    getModule: () => COMPILER_WASM_URL,
    beforeBuild: [],
});
$typst.setRendererInitOptions({
    getModule: () => RENDERER_WASM_URL,
    beforeBuild: [],
});

export interface RenderOptions {
    pixelPerPt?: number;
    backgroundColor?: string;
    pageIndex?: number;
}

export class TypstRendererService {
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                console.log('[TypstRenderer] Initializing via $typst high-level API...');
                this.isInitialized = true;
                console.log('[TypstRenderer] Ready (WASM will lazy-init on first render)');
            } catch (err) {
                console.error('[TypstRenderer] Init failed:', err);
                this.initPromise = null;
                throw err;
            }
        })();

        return this.initPromise;
    }

    /**
     * Render Typst source to SVG string
     */
    async renderToSvg(document: SemanticDocument): Promise<string> {
        await this.init();

        console.log('[TypstRenderer] Rendering SVG, source length:', document.typstSource.length);

        const svgContent = await $typst.svg({
            mainContent: document.typstSource,
        });

        console.log('[TypstRenderer] SVG rendered, length:', svgContent.length);
        return svgContent;
    }

    /**
     * Compile source to PDF bytes via $typst.pdf()
     */
    async compileToPdf(document: SemanticDocument): Promise<Uint8Array> {
        await this.init();

        const pdfBytes = await $typst.pdf({
            mainContent: document.typstSource,
        });

        if (!pdfBytes) {
            throw new Error('PDF compilation returned no bytes');
        }

        return pdfBytes;
    }
}

/** Singleton instance */
export const typstRenderer = new TypstRendererService();
