// src/types/index.ts

// Export new Semantic Types
export * from './semantic';
export * from './hydration';

// Keep any other global types you might have (User, Auth, etc.)
// but REMOVE exports like 'TextRun', 'TextBlock' if they were from textDetection.ts
export interface Document {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}