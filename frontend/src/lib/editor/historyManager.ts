// Canva-style History Manager for Undo/Redo
// Supports 50-step history with JSON snapshot diffing

export interface HistoryState {
  id: string;
  timestamp: number;
  description: string;
  snapshot: any; // JSON-serializable state
}

export interface HistoryAction {
  type: 'text-edit' | 'text-style' | 'block-move' | 'block-delete' | 'block-add' | 
        'draw' | 'shape' | 'annotation' | 'image' | 'multi';
  description: string;
  targetId?: string;
  before: any;
  after: any;
}

class HistoryManager {
  private history: HistoryAction[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  private listeners: Set<() => void> = new Set();
  private isUndoRedoing: boolean = false;

  constructor() {
    // Bind keyboard shortcuts
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore if typing in input/textarea
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable) {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
    }
  }

  // Push a new action to history
  push(action: HistoryAction): void {
    if (this.isUndoRedoing) return;

    // Remove any future states if we're not at the end
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new action
    this.history.push(action);
    this.currentIndex++;

    // Trim history if exceeds max
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    this.notifyListeners();
    console.log(`📝 History: ${action.description} (${this.currentIndex + 1}/${this.history.length})`);
  }

  // Undo the last action
  undo(): HistoryAction | null {
    if (!this.canUndo()) {
      console.log('⚠️ Nothing to undo');
      return null;
    }

    this.isUndoRedoing = true;
    const action = this.history[this.currentIndex];
    this.currentIndex--;
    this.isUndoRedoing = false;

    this.notifyListeners();
    console.log(`↩️ Undo: ${action.description}`);
    return action;
  }

  // Redo the last undone action
  redo(): HistoryAction | null {
    if (!this.canRedo()) {
      console.log('⚠️ Nothing to redo');
      return null;
    }

    this.isUndoRedoing = true;
    this.currentIndex++;
    const action = this.history[this.currentIndex];
    this.isUndoRedoing = false;

    this.notifyListeners();
    console.log(`↪️ Redo: ${action.description}`);
    return action;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  // Get current state info
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historyLength: this.history.length,
      currentIndex: this.currentIndex,
      lastAction: this.currentIndex >= 0 ? this.history[this.currentIndex] : null
    };
  }

  // Subscribe to history changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Clear all history
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  // Get action at specific index (for debugging)
  getAction(index: number): HistoryAction | null {
    return this.history[index] || null;
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const historyManager = new HistoryManager();

// React hook for using history
import { useState, useEffect, useCallback } from 'react';

export function useHistory() {
  const [state, setState] = useState(historyManager.getState());

  useEffect(() => {
    return historyManager.subscribe(() => {
      setState(historyManager.getState());
    });
  }, []);

  const pushAction = useCallback((action: HistoryAction) => {
    historyManager.push(action);
  }, []);

  const undo = useCallback(() => {
    return historyManager.undo();
  }, []);

  const redo = useCallback(() => {
    return historyManager.redo();
  }, []);

  return {
    ...state,
    pushAction,
    undo,
    redo,
    clear: () => historyManager.clear()
  };
}
