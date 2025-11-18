import React, { useState, useCallback } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen } from '@excalidraw/excalidraw';
import { cn } from '@/lib/utils';

// Using any for Excalidraw types to avoid complex type issues
type ExcalidrawElement = any;
type AppState = any;
type BinaryFiles = any;

/**
 * Excalidraw Layer Component
 * Handles Sketch Mode - Freehand drawings and quick diagrams
 */

interface ExcalidrawLayerProps {
  width: number;
  height: number;
  initialElements?: readonly ExcalidrawElement[];
  initialAppState?: Partial<AppState>;
  onChange?: (elements: readonly ExcalidrawElement[], appState: AppState) => void;
  onSave?: (elements: readonly ExcalidrawElement[], appState: AppState) => void;
  visible?: boolean;
  className?: string;
}

export function ExcalidrawLayer({
  width,
  height,
  initialElements = [],
  initialAppState,
  onChange,
  onSave,
  visible = true,
  className,
}: ExcalidrawLayerProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const handleChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
    onChange?.(elements, appState);
  }, [onChange]);

  const handleSave = useCallback(() => {
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      onSave?.(elements, appState);
    }
  }, [excalidrawAPI, onSave]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements: [],
      });
    }
  }, [excalidrawAPI]);

  // Export as PNG
  const exportAsPNG = useCallback(async () => {
    if (excalidrawAPI) {
      const blob = await excalidrawAPI.exportToBlob({
        mimeType: 'image/png',
        quality: 1,
      });
      return blob;
    }
    return null;
  }, [excalidrawAPI]);

  // Load scene data
  const loadScene = useCallback((elements: readonly ExcalidrawElement[], appState?: Partial<AppState>) => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements,
        appState,
      });
    }
  }, [excalidrawAPI]);

  // Expose methods via imperative handle if needed
  React.useImperativeHandle(excalidrawAPI, () => ({
    clearCanvas,
    exportAsPNG,
    loadScene,
    handleSave,
  }));

  return (
    <div 
      className={cn(className, "excalidraw-wrapper")}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* @ts-ignore - React 18/19 type conflict with Excalidraw */}
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: initialElements as ExcalidrawElement[],
          appState: {
            ...initialAppState,
            viewBackgroundColor: 'transparent',
            currentItemStrokeColor: '#000000',
            currentItemBackgroundColor: 'transparent',
            currentItemFillStyle: 'solid',
            currentItemStrokeWidth: 2,
            currentItemRoughness: 1,
            currentItemOpacity: 100,
            gridSize: null,
          },
        }}
        onChange={handleChange}
        onPaste={(data: any, event: any) => {
          console.log('[ExcalidrawLayer] Paste event', data);
          return false;
        }}
        renderTopRightUI={() => (
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Save Sketch
          </button>
        )}
      >
        {/* @ts-ignore - React 18/19 type conflict with Excalidraw */}
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ToggleTheme />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
}

export default ExcalidrawLayer;
