/**
 * Shared Data Models for UniPDF Studio
 * These types are used by both backend and frontend
 */

// =============================================================================
// User & Authentication
// =============================================================================

export interface User {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    isGuest: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: User;
}

export type AuthProvider = 'google' | 'anonymous';

// =============================================================================
// Documents
// =============================================================================

export interface Document {
    id: string;
    userId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    storagePath: string;
    thumbnailUrl?: string | null;
    pageCount?: number;
    status: DocumentStatus;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface DocumentVersion {
    id: string;
    documentId: string;
    versionNumber: number;
    fileUrl: string;
    createdBy: string;
    createdAt: string;
}

// =============================================================================
// Annotations
// =============================================================================

export interface Annotation {
    id: string;
    documentId: string;
    userId: string;
    pageNumber: number;
    type: AnnotationType;
    content: AnnotationContent;
    position?: AnnotationPosition;
    createdAt: string;
    updatedAt: string;
}

export type AnnotationType = 'comment' | 'highlight' | 'text' | 'drawing' | 'shape';

export interface AnnotationContent {
    objects?: FabricObject[];
    version?: string;
    text?: string;
    color?: string;
}

export interface AnnotationPosition {
    x: number;
    y: number;
    width?: number;
    height?: number;
    pageX?: number;
    pageY?: number;
}

// Simplified Fabric.js object type (for serialization)
export interface FabricObject {
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
    scaleX?: number;
    scaleY?: number;
    path?: unknown[];
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    layerId?: string;
    [key: string]: unknown;
}

// =============================================================================
// Layers (Runtime - mainly frontend)
// =============================================================================

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    order: number;
}

// =============================================================================
// PDF Hydration (Runtime)
// =============================================================================

export interface HydratedPage {
    pageIndex: number;
    dims: PageDimensions;
    blocks: ContentBlock[];
    backgroundBlob?: Blob;
}

export interface PageDimensions {
    width: number;
    height: number;
}

export type ContentBlock = TextBlock | ImageBlock;

export interface TextBlock {
    type: 'text';
    id: string;
    box: BoundingBox; // [x%, y%, w%, h%]
    html: string;
    styles: TextStyles;
}

export interface ImageBlock {
    type: 'image';
    id: string;
    box: BoundingBox;
    blob: Blob;
    mimeType: string;
}

export type BoundingBox = [number, number, number, number];

export interface TextStyles {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
    color: string;
    align: TextAlign;
    italic: boolean;
    lineHeight?: number;
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// =============================================================================
// Drawing Tools
// =============================================================================

export type DrawingTool =
    | 'select'
    | 'pen'
    | 'highlighter'
    | 'eraser'
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'arrow'
    | 'text'
    | 'sticky'
    | 'hand'
    | 'callout'
    | 'link'
    | 'signature'
    | 'stamp-approved'
    | 'stamp-draft'
    | 'stamp-confidential';

// =============================================================================
// AI Features
// =============================================================================

export type AISummaryLength = 'brief' | 'detailed';

export type AIRewriteTone = 'formal' | 'casual' | 'concise' | 'detailed';

export interface AIKeyInfo {
    topics: string[];
    keyPoints: string[];
    entities: string[];
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    confidence?: number;
}

// =============================================================================
// File Conversion
// =============================================================================

export type SupportedFileType =
    | 'pdf'
    | 'doc'
    | 'docx'
    | 'txt'
    | 'rtf'
    | 'odt'
    | 'jpg'
    | 'jpeg'
    | 'png'
    | 'gif'
    | 'bmp'
    | 'tiff'
    | 'webp';

export interface FileTypeInfo {
    type: string;
    isSupported: boolean;
    canConvert: boolean;
    description: string;
}

// =============================================================================
// Processing Status
// =============================================================================

export type ProcessingStatus = 'idle' | 'processing' | 'complete' | 'error';

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

export interface ProcessingStageInfo {
    stage: ProcessingStage;
    message: string;
    pageNum?: number;
    totalPages?: number;
}
