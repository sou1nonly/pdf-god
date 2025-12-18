/**
 * Shared API Types for UniPDF Studio
 * Request and Response types for the REST API
 */

import type {
    User,
    Document,
    Annotation,
    ChatMessage,
    AISummaryLength,
    AIRewriteTone,
    AIKeyInfo,
} from './models';

// =============================================================================
// Generic API Response Types
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

export interface AnonymousAuthRequest {
    deviceId?: string;
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

export interface LogoutRequest {
    refreshToken?: string;
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

export interface GetPageAnnotationsResponse {
    annotation: Annotation | null;
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

export interface DeleteAnnotationsResponse {
    deleted: boolean;
    count?: number;
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

export interface DownloadFileResponse {
    blob: Blob;
    contentType: string;
    size: number;
}

export interface GetSignedUrlResponse {
    signedUrl: string;
    expiresAt: number;
}

export interface DeleteFileResponse {
    deleted: boolean;
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

export interface AIExtractRequest {
    documentText: string;
}

export interface AIExtractResponse {
    keyInfo: AIKeyInfo;
}

// =============================================================================
// Convert API
// =============================================================================

export interface ConvertImageRequest {
    file: File;
    quality?: 'low' | 'medium' | 'high';
}

export interface ConvertTextRequest {
    file: File;
}

export interface ConvertDocumentRequest {
    file: File;
}

export interface ConvertResponse {
    success: boolean;
    pdfBlob?: Blob;
    pdfUrl?: string;
    error?: string;
}

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
    // Auth errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

    // Document errors
    DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
    DOCUMENT_ACCESS_DENIED: 'DOCUMENT_ACCESS_DENIED',
    DOCUMENT_INVALID_TYPE: 'DOCUMENT_INVALID_TYPE',

    // Storage errors
    STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
    STORAGE_FILE_NOT_FOUND: 'STORAGE_FILE_NOT_FOUND',
    STORAGE_FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',

    // AI errors
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    AI_RATE_LIMITED: 'AI_RATE_LIMITED',
    AI_INVALID_REQUEST: 'AI_INVALID_REQUEST',

    // Validation errors
    VALIDATION_FAILED: 'VALIDATION_FAILED',

    // Generic errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
