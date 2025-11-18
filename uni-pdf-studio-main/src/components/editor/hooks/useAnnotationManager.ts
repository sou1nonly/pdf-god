import { useState, useCallback } from 'react';
import type { 
  HybridAnnotation, 
  SketchAnnotation,
  DesignAnnotation,
  TextAnnotation 
} from '../types/hybridAnnotations';

/**
 * Annotation Manager
 * Coordinates all three annotation layers (Fabric, Excalidraw, TipTap)
 * Handles unified state management, saving, and loading
 */

export interface AnnotationManagerState {
  designAnnotations: Map<number, DesignAnnotation[]>; // Page number -> annotations (Fabric.js)
  sketchAnnotations: Map<number, SketchAnnotation[]>; // Page number -> annotations (Excalidraw)
  textAnnotations: Map<number, TextAnnotation[]>; // Page number -> annotations (TipTap)
}

export function useAnnotationManager() {
  const [state, setState] = useState<AnnotationManagerState>({
    designAnnotations: new Map(),
    sketchAnnotations: new Map(),
    textAnnotations: new Map(),
  });

  const [history, setHistory] = useState<AnnotationManagerState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Add to history for undo/redo
  const addToHistory = useCallback((newState: AnnotationManagerState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Design annotations (Fabric.js)
  const updateDesignAnnotations = useCallback((pageNumber: number, annotations: DesignAnnotation[]) => {
    setState(prev => {
      const newState = {
        ...prev,
        designAnnotations: new Map(prev.designAnnotations),
      };
      newState.designAnnotations.set(pageNumber, annotations);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const addDesignAnnotation = useCallback((pageNumber: number, annotation: DesignAnnotation) => {
    setState(prev => {
      const newState = {
        ...prev,
        designAnnotations: new Map(prev.designAnnotations),
      };
      const pageAnnotations = newState.designAnnotations.get(pageNumber) || [];
      newState.designAnnotations.set(pageNumber, [...pageAnnotations, annotation]);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const deleteDesignAnnotation = useCallback((pageNumber: number, annotationId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        designAnnotations: new Map(prev.designAnnotations),
      };
      const pageAnnotations = newState.designAnnotations.get(pageNumber) || [];
      newState.designAnnotations.set(
        pageNumber,
        pageAnnotations.filter(a => a.id !== annotationId)
      );
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  // Sketch annotations (Excalidraw)
  const updateSketchAnnotations = useCallback((pageNumber: number, annotations: SketchAnnotation[]) => {
    setState(prev => {
      const newState = {
        ...prev,
        sketchAnnotations: new Map(prev.sketchAnnotations),
      };
      newState.sketchAnnotations.set(pageNumber, annotations);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  // Text annotations
  const updateTextAnnotation = useCallback((annotation: TextAnnotation) => {
    setState(prev => {
      const newState = {
        ...prev,
        textAnnotations: new Map(prev.textAnnotations),
      };
      const pageAnnotations = newState.textAnnotations.get(annotation.pageNumber) || [];
      const index = pageAnnotations.findIndex(a => a.id === annotation.id);
      
      if (index >= 0) {
        pageAnnotations[index] = annotation;
      } else {
        pageAnnotations.push(annotation);
      }
      
      newState.textAnnotations.set(annotation.pageNumber, [...pageAnnotations]);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const addTextAnnotation = useCallback((pageNumber: number, annotation: TextAnnotation) => {
    setState(prev => {
      const newState = {
        ...prev,
        textAnnotations: new Map(prev.textAnnotations),
      };
      const pageAnnotations = newState.textAnnotations.get(pageNumber) || [];
      newState.textAnnotations.set(pageNumber, [...pageAnnotations, annotation]);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const deleteTextAnnotation = useCallback((pageNumber: number, annotationId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        textAnnotations: new Map(prev.textAnnotations),
      };
      const pageAnnotations = newState.textAnnotations.get(pageNumber) || [];
      newState.textAnnotations.set(
        pageNumber,
        pageAnnotations.filter(a => a.id !== annotationId)
      );
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const moveTextAnnotation = useCallback((annotationId: string, pageNumber: number, x: number, y: number) => {
    setState(prev => {
      const newState = {
        ...prev,
        textAnnotations: new Map(prev.textAnnotations),
      };
      const pageAnnotations = newState.textAnnotations.get(pageNumber) || [];
      const index = pageAnnotations.findIndex(a => a.id === annotationId);
      
      if (index >= 0) {
        pageAnnotations[index] = {
          ...pageAnnotations[index],
          textData: {
            ...pageAnnotations[index].textData,
            position: { x, y },
          },
        };
        newState.textAnnotations.set(pageNumber, [...pageAnnotations]);
        addToHistory(newState);
      }
      
      return newState;
    });
  }, [addToHistory]);

  const resizeTextAnnotation = useCallback((annotationId: string, pageNumber: number, width: number) => {
    setState(prev => {
      const newState = {
        ...prev,
        textAnnotations: new Map(prev.textAnnotations),
      };
      const pageAnnotations = newState.textAnnotations.get(pageNumber) || [];
      const index = pageAnnotations.findIndex(a => a.id === annotationId);
      
      if (index >= 0) {
        pageAnnotations[index] = {
          ...pageAnnotations[index],
          textData: {
            ...pageAnnotations[index].textData,
            width,
          },
        };
        newState.textAnnotations.set(pageNumber, [...pageAnnotations]);
        addToHistory(newState);
      }
      
      return newState;
    });
  }, [addToHistory]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setState(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setState(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Clear all annotations for a page
  const clearPage = useCallback((pageNumber: number) => {
    setState(prev => {
      const newState = {
        designAnnotations: new Map(prev.designAnnotations),
        sketchAnnotations: new Map(prev.sketchAnnotations),
        textAnnotations: new Map(prev.textAnnotations),
      };
      
      newState.designAnnotations.delete(pageNumber);
      newState.sketchAnnotations.delete(pageNumber);
      newState.textAnnotations.delete(pageNumber);
      
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  // Clear all annotations
  const clearAll = useCallback(() => {
    const newState: AnnotationManagerState = {
      designAnnotations: new Map(),
      sketchAnnotations: new Map(),
      textAnnotations: new Map(),
    };
    setState(newState);
    addToHistory(newState);
  }, [addToHistory]);

  // Serialize to JSON for saving
  const serializeToJSON = useCallback(() => {
    return {
      designAnnotations: Array.from(state.designAnnotations.entries()),
      sketchAnnotations: Array.from(state.sketchAnnotations.entries()),
      textAnnotations: Array.from(state.textAnnotations.entries()),
      version: '1.0',
      timestamp: Date.now(),
    };
  }, [state]);

  // Deserialize from JSON for loading
  const loadFromJSON = useCallback((json: any) => {
    try {
      const newState: AnnotationManagerState = {
        designAnnotations: new Map(json.designAnnotations || []),
        sketchAnnotations: new Map(json.sketchAnnotations || []),
        textAnnotations: new Map(json.textAnnotations || []),
      };
      setState(newState);
      addToHistory(newState);
      return true;
    } catch (error) {
      console.error('[AnnotationManager] Failed to load annotations:', error);
      return false;
    }
  }, [addToHistory]);

  // Get all annotations for a specific page
  const getPageAnnotations = useCallback((pageNumber: number) => {
    return {
      design: state.designAnnotations.get(pageNumber) || [],
      sketch: state.sketchAnnotations.get(pageNumber) || [],
      text: state.textAnnotations.get(pageNumber) || [],
    };
  }, [state]);

  // Get total count of annotations
  const getTotalCount = useCallback(() => {
    let count = 0;
    state.designAnnotations.forEach(annotations => count += annotations.length);
    state.sketchAnnotations.forEach(annotations => count += annotations.length);
    state.textAnnotations.forEach(annotations => count += annotations.length);
    return count;
  }, [state]);

  return {
    state,
    
    // Design (Fabric.js) methods
    updateDesignAnnotations,
    addDesignAnnotation,
    deleteDesignAnnotation,
    
    // Sketch (Excalidraw) methods
    updateSketchAnnotations,
    
    // Text annotation methods
    updateTextAnnotation,
    addTextAnnotation,
    deleteTextAnnotation,
    moveTextAnnotation,
    resizeTextAnnotation,
    
    // History methods
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Utility methods
    clearPage,
    clearAll,
    serializeToJSON,
    loadFromJSON,
    getPageAnnotations,
    getTotalCount,
  };
}

export default useAnnotationManager;
