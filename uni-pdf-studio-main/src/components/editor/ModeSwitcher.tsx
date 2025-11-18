import React from 'react';
import { Pencil, Box, MessageSquare } from 'lucide-react';
import { EditorMode, useEditorMode, getModeName, getModeDescription } from '@/contexts/EditorModeContext';
import { cn } from '@/lib/utils';

/**
 * Mode Switcher Component
 * Allows users to switch between Sketch, Design, and Annotate modes
 */

interface ModeButtonProps {
  mode: EditorMode;
  icon: React.ReactNode;
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

function ModeButton({ mode, icon, label, description, isActive, onClick }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
        'hover:shadow-md hover:scale-105',
        isActive 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
      title={description}
    >
      <div className={cn(
        'p-3 rounded-full transition-colors',
        isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
      )}>
        {icon}
      </div>
      <span className={cn(
        'text-sm font-medium',
        isActive ? 'text-blue-700' : 'text-gray-700'
      )}>
        {label}
      </span>
      <span className={cn(
        'text-xs text-center max-w-[120px]',
        isActive ? 'text-blue-600' : 'text-gray-500'
      )}>
        {description}
      </span>
    </button>
  );
}

interface ModeSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function ModeSwitcher({ className, compact = false }: ModeSwitcherProps) {
  const { mode, setMode } = useEditorMode();

  if (compact) {
    return (
      <div className={cn('flex gap-1 p-1 bg-gray-100 rounded-lg', className)}>
        <button
          onClick={() => setMode(EditorMode.SKETCH)}
          className={cn(
            'p-2 rounded transition-colors',
            mode === EditorMode.SKETCH 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:bg-gray-200'
          )}
          title={getModeDescription(EditorMode.SKETCH)}
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => setMode(EditorMode.DESIGN)}
          className={cn(
            'p-2 rounded transition-colors',
            mode === EditorMode.DESIGN 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:bg-gray-200'
          )}
          title={getModeDescription(EditorMode.DESIGN)}
        >
          <Box size={18} />
        </button>
        <button
          onClick={() => setMode(EditorMode.ANNOTATE)}
          className={cn(
            'p-2 rounded transition-colors',
            mode === EditorMode.ANNOTATE 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:bg-gray-200'
          )}
          title={getModeDescription(EditorMode.ANNOTATE)}
        >
          <MessageSquare size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-4', className)}>
      <ModeButton
        mode={EditorMode.SKETCH}
        icon={<Pencil size={24} />}
        label="Sketch"
        description="Freehand drawing & diagrams"
        isActive={mode === EditorMode.SKETCH}
        onClick={() => setMode(EditorMode.SKETCH)}
      />
      <ModeButton
        mode={EditorMode.DESIGN}
        icon={<Box size={24} />}
        label="Design"
        description="Precise shapes & layouts"
        isActive={mode === EditorMode.DESIGN}
        onClick={() => setMode(EditorMode.DESIGN)}
      />
      <ModeButton
        mode={EditorMode.ANNOTATE}
        icon={<MessageSquare size={24} />}
        label="Annotate"
        description="Rich text comments"
        isActive={mode === EditorMode.ANNOTATE}
        onClick={() => setMode(EditorMode.ANNOTATE)}
      />
    </div>
  );
}

/**
 * Mode indicator badge for showing current mode
 */
export function ModeIndicator({ className }: { className?: string }) {
  const { mode } = useEditorMode();
  
  const getModeColor = (mode: EditorMode) => {
    switch (mode) {
      case EditorMode.SKETCH:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case EditorMode.DESIGN:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case EditorMode.ANNOTATE:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium',
      getModeColor(mode),
      className
    )}>
      {mode === EditorMode.SKETCH && <Pencil size={14} />}
      {mode === EditorMode.DESIGN && <Box size={14} />}
      {mode === EditorMode.ANNOTATE && <MessageSquare size={14} />}
      <span>{getModeName(mode)}</span>
    </div>
  );
}
