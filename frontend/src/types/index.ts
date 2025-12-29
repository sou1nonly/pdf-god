/**
 * Shared Types for Lamina Frontend
 * Data models and API types
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
// Layers
// =============================================================================

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

// =============================================================================
// PDF Hydration
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
  box: BoundingBox;
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
  | 'pdf' | 'doc' | 'docx' | 'txt' | 'rtf' | 'odt'
  | 'jpg' | 'jpeg' | 'png' | 'gif' | 'bmp' | 'tiff' | 'webp';

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
  | 'idle' | 'opening' | 'scanning' | 'ai-init' | 'ai-ready' | 'ai-skip'
  | 'extracting' | 'extracting-page' | 'analyzing' | 'ai-processing'
  | 'building' | 'complete';

export interface ProcessingStageInfo {
  stage: ProcessingStage;
  message: string;
  pageNum?: number;
  totalPages?: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  duration?: number;
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// Auth API
// =============================================================================

export interface GoogleAuthRequest {
  idToken?: string;
  accessToken?: string;
  redirectTo?: string;
}

export interface GoogleAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AnonymousAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface CurrentUserResponse {
  user: User;
}

// =============================================================================
// Documents API
// =============================================================================

export interface ListDocumentsParams extends PaginationParams {
  search?: string;
  status?: string;
}

export interface ListDocumentsResponse extends PaginatedResponse<Document> { }

export interface GetDocumentResponse {
  document: Document;
}

export interface CreateDocumentRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
}

export interface CreateDocumentResponse {
  document: Document;
}

export interface UpdateDocumentRequest {
  fileName?: string;
  status?: string;
  isPublic?: boolean;
}

export interface UpdateDocumentResponse {
  document: Document;
}

export interface DeleteDocumentResponse {
  deleted: boolean;
}

// =============================================================================
// Annotations API
// =============================================================================

export interface GetAnnotationsResponse {
  annotations: Record<number, Annotation>;
}

export interface SaveAnnotationsRequest {
  pageNumber: number;
  type: 'drawing';
  content: {
    objects: unknown[];
    version: string;
  };
}

export interface SaveAnnotationsResponse {
  annotation: Annotation;
}

// =============================================================================
// Storage API
// =============================================================================

export interface UploadFileResponse {
  success: boolean;
  url: string;
  path: string;
  size: number;
}

// =============================================================================
// AI API
// =============================================================================

export interface AIChatRequest {
  message: string;
  documentText: string;
  history?: ChatMessage[];
}

export interface AIChatResponse {
  response: string;
  confidence?: number;
}

export interface AISummarizeRequest {
  documentText: string;
  length: AISummaryLength;
}

export interface AISummarizeResponse {
  summary: string;
  wordCount: number;
}

export interface AIRewriteRequest {
  text: string;
  tone: AIRewriteTone;
}

export interface AIRewriteResponse {
  suggestions: string[];
}

export interface AIQuestionsRequest {
  documentText: string;
  count?: number;
}

export interface AIQuestionsResponse {
  questions: string[];
}

export interface AIExtractResponse {
  keyInfo: AIKeyInfo;
}

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ACCESS_DENIED: 'DOCUMENT_ACCESS_DENIED',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Re-export from existing type files
export * from './semantic';
export * from './hydration';
