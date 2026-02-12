/**
 * Semantic Document Engine
 * 
 * Barrel export for the semantic extraction and generation system.
 */

// Types
export type {
    SemanticDocument,
    SemanticSection,
    DocumentStructure,
    DocumentMetadata,
    PageInfo,
    SectionType,
    SectionStyles,
    SectionMeta,
    StyleChange,
    TargetPosition,
    ExtractorConfig,
    TypstGenerationResult,
} from './types';

export { DEFAULT_EXTRACTOR_CONFIG } from './types';

// Extractor
export { extractSemanticDocument } from './extractor';

// Utilities
export {
    escapeTypst,
    escapeTypstString,
    cssColorToTypst,
    mapFontFamily,
    typstHeading,
    typstStyledText,
    typstPlace,
    typstPageSetup,
    typstListItem,
    typstAlign,
    generateSectionId,
    resetSectionIdCounter,
    typstDocumentPreamble,
} from './typst-utils';

export { TypstRendererService, typstRenderer } from './renderer';
