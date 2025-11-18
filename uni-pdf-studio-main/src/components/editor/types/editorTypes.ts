import { fabric } from 'fabric';

export interface HistoryDiff {
  type: 'full' | 'diff';
  timestamp: number;
  changes?: Array<{
    action: 'add' | 'modify' | 'remove';
    objectId: string;
    data?: any;
  }>;
  fullState?: any;
}

export interface GuidelinePool {
  vertical: fabric.Line[];
  horizontal: fabric.Line[];
  initialized: boolean;
}

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  totalRenderTime: number;
}

export interface TextLayerCache {
  fragments: Map<number, DocumentFragment>;
  currentScale: number;
}

export interface MouseHandlers {
  mouseDown: (e: any) => void;
  mouseMove: (e: any) => void;
  mouseUp: (e: any) => void;
}
