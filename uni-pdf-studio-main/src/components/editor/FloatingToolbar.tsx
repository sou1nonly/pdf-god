import React, { useState } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Minus, Plus, Palette } from 'lucide-react';
import { TextBlockStyles } from '@/types/hydration';

// Cast icons to fix TS version mismatch
const icons = {
  Bold: Bold as any,
  Italic: Italic as any,
  Underline: Underline as any,
  AlignLeft: AlignLeft as any,
  AlignCenter: AlignCenter as any,
  AlignRight: AlignRight as any,
  Minus: Minus as any,
  Plus: Plus as any,
  Palette: Palette as any,
};

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

  return (
    <div 
      className="flex items-center gap-1 p-1.5 bg-white rounded-lg shadow-xl border border-gray-200"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font Family */}
      <select 
        value={styles.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Inter'} 
        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        className="h-7 text-xs border border-gray-200 rounded px-2 bg-white focus:outline-none focus:border-blue-500"
      >
        <option value="Inter">Inter</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times</option>
        <option value="Courier New">Courier</option>
        <option value="Georgia">Georgia</option>
      </select>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Font Size */}
      <button 
        className={btnClass}
        onClick={() => onUpdate({ fontSize: Math.max(8, styles.fontSize - 1) })}
      >
        <icons.Minus size={14} />
      </button>
      <span className="text-xs w-6 text-center font-medium">{Math.round(styles.fontSize)}</span>
      <button 
        className={btnClass}
        onClick={() => onUpdate({ fontSize: styles.fontSize + 1 })}
      >
        <icons.Plus size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Styles */}
      <button 
        className={styles.fontWeight >= 700 ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ fontWeight: styles.fontWeight >= 700 ? 400 : 700 })}
        title="Bold (Ctrl+B)"
      >
        <icons.Bold size={14} />
      </button>
      
      <button 
        className={styles.italic ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ italic: !styles.italic })}
        title="Italic (Ctrl+I)"
      >
        <icons.Italic size={14} />
      </button>
      
      <button 
        className={styles.underline ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ underline: !styles.underline })}
        title="Underline (Ctrl+U)"
      >
        <icons.Underline size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Alignment */}
      <button 
        className={styles.align === 'left' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'left' })}
      >
        <icons.AlignLeft size={14} />
      </button>
      <button 
        className={styles.align === 'center' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'center' })}
      >
        <icons.AlignCenter size={14} />
      </button>
      <button 
        className={styles.align === 'right' ? activeBtnClass : btnClass}
        onClick={() => onUpdate({ align: 'right' })}
      >
        <icons.AlignRight size={14} />
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Color Picker with Presets */}
      <div className="relative">
        <button
          className={btnClass}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
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
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-5 gap-1 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                    styles.color === color ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onUpdate({ color });
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <input 
                type="color" 
                value={styles.color || '#000000'} 
                onChange={(e) => onUpdate({ color: e.target.value })}
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
