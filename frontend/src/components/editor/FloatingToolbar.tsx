import React, { useState, useCallback } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Minus, Plus, Palette, Strikethrough, Subscript, Superscript } from 'lucide-react';
import { TextBlockStyles } from '@/types/hydration';

// Cast icons to fix TS version mismatch
const icons = {
  Bold: Bold as any,
  Italic: Italic as any,
  Underline: Underline as any,
  Strikethrough: Strikethrough as any,
  Subscript: Subscript as any,
  Superscript: Superscript as any,
  AlignLeft: AlignLeft as any,
  AlignCenter: AlignCenter as any,
  AlignRight: AlignRight as any,
  Minus: Minus as any,
  Plus: Plus as any,
  Palette: Palette as any,
};

// Extended font list
const FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Garamond', value: 'Garamond, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Consolas', value: 'Consolas, monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Palatino', value: 'Palatino Linotype, serif' },
  { name: 'Lucida Sans', value: 'Lucida Sans, sans-serif' },
  { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
  { name: 'Impact', value: 'Impact, sans-serif' },
];

// Preset colors for quick selection
const PRESET_COLORS = [
  '#000000', // Black
  '#374151', // Gray
  '#DC2626', // Red
  '#EA580C', // Orange
  '#CA8A04', // Yellow
  '#16A34A', // Green
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#FFFFFF', // White
];

interface FloatingToolbarProps {
  styles: TextBlockStyles;
  onUpdate: (styles: Partial<TextBlockStyles>) => void;
  position?: { top: number; left: number; width: number }; // Optional, parent handles positioning
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ styles, onUpdate }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const btnClass = "p-1.5 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center transition-colors";
  const activeBtnClass = "p-1.5 bg-blue-100 text-blue-700 rounded flex items-center justify-center transition-colors";

  // Check if there's an active text selection
  const hasSelection = useCallback(() => {
    const selection = window.getSelection();
    return selection && selection.toString().length > 0;
  }, []);

  // Apply inline formatting using execCommand (for selected text only)
  const applyInlineFormat = useCallback((command: string, value?: string) => {
    // Prevent losing focus
    document.execCommand(command, false, value);
  }, []);

  // Check if current selection has a specific format
  const queryFormat = useCallback((command: string) => {
    return document.queryCommandState(command);
  }, []);

  // Handle bold - applies to selection if available, otherwise whole block
  const handleBold = useCallback(() => {
    if (hasSelection()) {
      applyInlineFormat('bold');
    } else {
      onUpdate({ fontWeight: styles.fontWeight >= 700 ? 400 : 700 });
    }
  }, [hasSelection, applyInlineFormat, onUpdate, styles.fontWeight]);

  // Handle italic
  const handleItalic = useCallback(() => {
    if (hasSelection()) {
      applyInlineFormat('italic');
    } else {
      onUpdate({ italic: !styles.italic });
    }
  }, [hasSelection, applyInlineFormat, onUpdate, styles.italic]);

  // Handle underline
  const handleUnderline = useCallback(() => {
    if (hasSelection()) {
      applyInlineFormat('underline');
    } else {
      onUpdate({ underline: !styles.underline });
    }
  }, [hasSelection, applyInlineFormat, onUpdate, styles.underline]);

  // Handle strikethrough
  const handleStrikethrough = useCallback(() => {
    if (hasSelection()) {
      applyInlineFormat('strikeThrough');
    }
  }, [hasSelection, applyInlineFormat]);

  // Handle font change - applies to selection or whole block
  const handleFontChange = useCallback((fontValue: string) => {
    if (hasSelection()) {
      applyInlineFormat('fontName', fontValue.split(',')[0].trim());
    } else {
      onUpdate({ fontFamily: fontValue });
    }
  }, [hasSelection, applyInlineFormat, onUpdate]);

  // Handle color change
  const handleColorChange = useCallback((color: string) => {
    if (hasSelection()) {
      applyInlineFormat('foreColor', color);
    } else {
      onUpdate({ color });
    }
    setShowColorPicker(false);
  }, [hasSelection, applyInlineFormat, onUpdate]);

  // Handle font size change
  const handleFontSizeChange = useCallback((delta: number) => {
    if (hasSelection()) {
      // For selection, use fontSize command (1-7 scale)
      // This is a limitation of execCommand, so we'll just change the whole block for size
      onUpdate({ fontSize: Math.max(8, styles.fontSize + delta) });
    } else {
      onUpdate({ fontSize: Math.max(8, styles.fontSize + delta) });
    }
  }, [hasSelection, onUpdate, styles.fontSize]);

  return (
    <div 
      className="flex items-center gap-1 p-1.5 bg-white rounded-lg shadow-xl border border-gray-200"
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font Family - Extended List */}
      <select 
        value={styles.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Inter'} 
        onChange={(e) => handleFontChange(e.target.value)}
        className="h-7 text-xs border border-gray-200 rounded px-2 bg-white focus:outline-none focus:border-blue-500 max-w-[100px]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {FONTS.map(font => (
          <option key={font.name} value={font.value} style={{ fontFamily: font.value }}>
            {font.name}
          </option>
        ))}
      </select>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Font Size */}
      <button 
        className={btnClass}
        onClick={() => handleFontSizeChange(-1)}
        title="Decrease font size"
      >
        <icons.Minus size={14} />
      </button>
      <span className="text-xs w-6 text-center font-medium">{Math.round(styles.fontSize)}</span>
      <button 
        className={btnClass}
        onClick={() => handleFontSizeChange(1)}
        title="Increase font size"
      >
        <icons.Plus size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Text Formatting - Works on Selection */}
      <button 
        className={styles.fontWeight >= 700 ? activeBtnClass : btnClass}
        onClick={handleBold}
        title="Bold (Ctrl+B) - Select text first for inline formatting"
      >
        <icons.Bold size={14} />
      </button>
      
      <button 
        className={styles.italic ? activeBtnClass : btnClass}
        onClick={handleItalic}
        title="Italic (Ctrl+I) - Select text first for inline formatting"
      >
        <icons.Italic size={14} />
      </button>
      
      <button 
        className={styles.underline ? activeBtnClass : btnClass}
        onClick={handleUnderline}
        title="Underline (Ctrl+U) - Select text first for inline formatting"
      >
        <icons.Underline size={14} />
      </button>

      <button 
        className={btnClass}
        onClick={handleStrikethrough}
        title="Strikethrough - Select text first"
      >
        <icons.Strikethrough size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Alignment - Always applies to whole block */}
      <button 
        className={styles.align === 'left' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'left' })}
        title="Align Left"
      >
        <icons.AlignLeft size={14} />
      </button>
      <button 
        className={styles.align === 'center' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'center' })}
        title="Align Center"
      >
        <icons.AlignCenter size={14} />
      </button>
      <button 
        className={styles.align === 'right' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'right' })}
        title="Align Right"
      >
        <icons.AlignRight size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Color Picker - Works on Selection */}
      <div className="relative">
        <button
          className={btnClass}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color - Select text first for inline coloring"
        >
          <div className="flex flex-col items-center">
            <icons.Palette size={14} />
            <div 
              className="w-4 h-1 rounded-full mt-0.5" 
              style={{ backgroundColor: styles.color || '#000000' }}
            />
          </div>
        </button>
        
        {showColorPicker && (
          <div 
            className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-5 gap-1 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                    styles.color === color ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <input 
                type="color" 
                value={styles.color || '#000000'} 
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-6 h-6 cursor-pointer border-0 p-0"
              />
              <span className="text-xs text-gray-500">Custom</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
