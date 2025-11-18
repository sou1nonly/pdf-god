import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TextAnnotation } from '../types/hybridAnnotations';

/**
 * TipTap Text Annotation Component
 * Handles Annotate Mode - Rich text comments and notes
 */

interface TipTapTextBoxProps {
  annotation: TextAnnotation;
  onUpdate: (content: string) => void;
  onDelete: () => void;
  onMove: (x: number, y: number) => void;
  onResize?: (width: number) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function TipTapTextBox({
  annotation,
  onUpdate,
  onDelete,
  onMove,
  onResize,
  isSelected = false,
  onSelect,
}: TipTapTextBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable strike from StarterKit to avoid conflicts
        strike: false,
      }),
      Highlight,
      TextStyle,
      Color,
      Underline, // Only one Underline extension
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    content: annotation.textData.content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-2 min-h-[60px]',
      },
    },
  });

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - annotation.textData.position.x,
        y: e.clientY - annotation.textData.position.y,
      });
      e.preventDefault();
    }
  }, [annotation.textData.position]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      onMove(newX, newY);
    }
  }, [isDragging, dragStart, onMove]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag as any);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag as any);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'absolute rounded-lg shadow-lg border-2 transition-all',
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200',
        isDragging && 'cursor-move opacity-80'
      )}
      style={{
        left: annotation.textData.position.x,
        top: annotation.textData.position.y,
        width: annotation.textData.width,
        backgroundColor: annotation.textData.backgroundColor || '#fef3c7',
      }}
      onClick={onSelect}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-white/90 rounded-t-lg">
        <div
          className="drag-handle flex items-center gap-1 cursor-move p-1 hover:bg-gray-100 rounded"
          onMouseDown={handleDragStart}
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>

        <div className="flex items-center gap-1">
          {/* Text formatting buttons */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('bold') && 'bg-gray-200'
            )}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('italic') && 'bg-gray-200'
            )}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('underline') && 'bg-gray-200'
            )}
            title="Underline"
          >
            <UnderlineIcon size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('strike') && 'bg-gray-200'
            )}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('highlight') && 'bg-yellow-200'
            )}
            title="Highlight"
          >
            <Highlighter size={14} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* List buttons */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('bulletList') && 'bg-gray-200'
            )}
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive('orderedList') && 'bg-gray-200'
            )}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Alignment buttons */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive({ textAlign: 'left' }) && 'bg-gray-200'
            )}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive({ textAlign: 'center' }) && 'bg-gray-200'
            )}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(
              'p-1 rounded hover:bg-gray-100',
              editor.isActive({ textAlign: 'right' }) && 'bg-gray-200'
            )}
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Color picker */}
          <input
            type="color"
            value={editor.getAttributes('textStyle').color || '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-6 h-6 rounded cursor-pointer"
            title="Text Color"
          />

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-100 text-red-500"
            title="Delete"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      {/* Resize handle */}
      {onResize && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-tl cursor-nwse-resize"
          style={{ cursor: 'se-resize' }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startWidth = annotation.textData.width;
            const startX = e.clientX;

            const handleResize = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const newWidth = Math.max(200, startWidth + deltaX);
              onResize(newWidth);
            };

            const handleResizeEnd = () => {
              document.removeEventListener('mousemove', handleResize);
              document.removeEventListener('mouseup', handleResizeEnd);
            };

            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
          }}
        />
      )}
    </div>
  );
}

/**
 * Container for all text annotations on current page
 */

interface TipTapAnnotationsProps {
  annotations: TextAnnotation[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number) => void;
  onAdd?: (x: number, y: number) => void;
  visible?: boolean;
  className?: string;
}

export function TipTapAnnotations({
  annotations,
  onUpdate,
  onDelete,
  onMove,
  onResize,
  onAdd,
  visible = true,
  className,
}: TipTapAnnotationsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Add new annotation on double-click
    if (e.detail === 2 && onAdd) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onAdd(x, y);
    }
  }, [onAdd]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn('absolute inset-0 pointer-events-auto', className)}
      onClick={handleClick}
    >
      {annotations.map((annotation) => (
        <TipTapTextBox
          key={annotation.id}
          annotation={annotation}
          onUpdate={(content) => onUpdate(annotation.id, content)}
          onDelete={() => onDelete(annotation.id)}
          onMove={(x, y) => onMove(annotation.id, x, y)}
          onResize={onResize ? (width) => onResize(annotation.id, width) : undefined}
          isSelected={selectedId === annotation.id}
          onSelect={() => setSelectedId(annotation.id)}
        />
      ))}
    </div>
  );
}

export default TipTapAnnotations;
