import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Editor Modes for Triple Layer Hybrid Architecture
 * 
 * SKETCH: Freehand drawing and quick annotations (Excalidraw)
 * DESIGN: Precise shapes, images, and layout tools (Fabric.js)
 * ANNOTATE: Rich text comments and notes (TipTap)
 */
export enum EditorMode {
  SKETCH = 'sketch',
  DESIGN = 'design',
  ANNOTATE = 'annotate',
}

interface EditorModeContextType {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  isSketchMode: boolean;
  isDesignMode: boolean;
  isAnnotateMode: boolean;
}

const EditorModeContext = createContext<EditorModeContextType | undefined>(undefined);

interface EditorModeProviderProps {
  children: ReactNode;
  defaultMode?: EditorMode;
}

export function EditorModeProvider({ 
  children, 
  defaultMode = EditorMode.DESIGN 
}: EditorModeProviderProps) {
  const [mode, setMode] = useState<EditorMode>(defaultMode);

  const value: EditorModeContextType = {
    mode,
    setMode,
    isSketchMode: mode === EditorMode.SKETCH,
    isDesignMode: mode === EditorMode.DESIGN,
    isAnnotateMode: mode === EditorMode.ANNOTATE,
  };

  return (
    <EditorModeContext.Provider value={value}>
      {children}
    </EditorModeContext.Provider>
  );
}

export function useEditorMode() {
  const context = useContext(EditorModeContext);
  if (context === undefined) {
    throw new Error('useEditorMode must be used within EditorModeProvider');
  }
  return context;
}

// Helper function to get mode display name
export function getModeName(mode: EditorMode): string {
  switch (mode) {
    case EditorMode.SKETCH:
      return 'Sketch Mode';
    case EditorMode.DESIGN:
      return 'Design Mode';
    case EditorMode.ANNOTATE:
      return 'Annotate Mode';
    default:
      return 'Unknown Mode';
  }
}

// Helper function to get mode description
export function getModeDescription(mode: EditorMode): string {
  switch (mode) {
    case EditorMode.SKETCH:
      return 'Freehand drawing and quick sketches';
    case EditorMode.DESIGN:
      return 'Precise shapes, images, and layouts';
    case EditorMode.ANNOTATE:
      return 'Rich text comments and notes';
    default:
      return '';
  }
}
