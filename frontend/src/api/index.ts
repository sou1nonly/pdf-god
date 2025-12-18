/**
 * API Module Index
 * Main entry point for all API functionality
 */

// Export API client
export * from './client';
export { default as api } from './client';

// Export all services
export * from './services';

// Re-export commonly used items
export { authApi } from './services/auth.api';
export { documentsApi } from './services/documents.api';
export { annotationsApi } from './services/annotations.api';
export { storageApi } from './services/storage.api';
export { aiApi } from './services/ai.api';
export { convertApi } from './services/convert.api';
