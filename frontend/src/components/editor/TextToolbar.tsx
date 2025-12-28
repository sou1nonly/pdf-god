import React, { useState, useCallback } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Minus, Plus, Palette, Strikethrough, ChevronDown } from 'lucide-react';
import { FONTS, PRESET_COLORS } from '@/lib/editor/constants';

// Cast icons to fix TS version mismatch
const icons = {
    Bold: Bold as any,
    Italic: Italic as any,
    Underline: Underline as any,
    Strikethrough: Strikethrough as any,
    AlignLeft: AlignLeft as any,
    AlignCenter: AlignCenter as any,
    AlignRight: AlignRight as any,
    Minus: Minus as any,
    Plus: Plus as any,
    Palette: Palette as any,
    ChevronDown: ChevronDown as any,
};



interface TextToolbarProps {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    color?: string;
    onFontFamilyChange?: (value: string) => void;
    onFontSizeChange?: (value: number) => void;
    onFontWeightChange?: (value: number) => void;
    onItalicChange?: (value: boolean) => void;
    onUnderlineChange?: (value: boolean) => void;
    onAlignChange?: (value: 'left' | 'center' | 'right') => void;
    onColorChange?: (value: string) => void;
}

export const TextToolbar: React.FC<TextToolbarProps> = ({
    fontFamily = 'Inter, sans-serif',
    fontSize = 16,
    fontWeight = 400,
    italic = false,
    underline = false,
    align = 'left',
    color = '#000000',
    onFontFamilyChange,
    onFontSizeChange,
    onFontWeightChange,
    onItalicChange,
    onUnderlineChange,
    onAlignChange,
    onColorChange,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false);
    const [customColor, setCustomColor] = useState(color);

    // Sync local color state with prop when selection changes
    React.useEffect(() => {
        setCustomColor(color);
    }, [color]);

    const btnClass = "p-2.5 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-all cursor-pointer";
    const activeBtnClass = "p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center transition-all shadow-sm";

    // Apply inline formatting using execCommand (for selected text)
    const applyInlineFormat = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
    }, []);

    // Check if there's an active text selection
    const hasSelection = useCallback(() => {
        const selection = window.getSelection();
        return selection && selection.toString().length > 0;
    }, []);

    const handleBold = () => {
        if (hasSelection()) {
            applyInlineFormat('bold');
        }
        onFontWeightChange?.(fontWeight >= 700 ? 400 : 700);
    };

    const handleItalic = () => {
        if (hasSelection()) {
            applyInlineFormat('italic');
        }
        onItalicChange?.(!italic);
    };

    const handleUnderline = () => {
        if (hasSelection()) {
            applyInlineFormat('underline');
        }
        onUnderlineChange?.(!underline);
    };

    const handleStrikethrough = () => {
        if (hasSelection()) {
            applyInlineFormat('strikeThrough');
        }
    };

    const handleColorChange = (newColor: string, closePicker = true) => {
        if (hasSelection()) {
            applyInlineFormat('foreColor', newColor);
        }
        onColorChange?.(newColor);
        if (closePicker) {
            setShowColorPicker(false);
        }
    };

    const handleFontChange = (font: typeof FONTS[0]) => {
        if (hasSelection()) {
            applyInlineFormat('fontName', font.value.split(',')[0].trim());
        }
        onFontFamilyChange?.(font.value);
        setShowFontPicker(false);
    };

    const currentFontName = fontFamily.split(',')[0].replace(/['\"]/g, '').trim();

    return (
        <div
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl ring-1 ring-black/5 border border-gray-100"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Font Family Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowFontPicker(!showFontPicker)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer min-w-[110px]"
                >
                    <span className="text-sm font-medium text-gray-700 truncate" style={{ fontFamily }}>
                        {currentFontName}
                    </span>
                    <icons.ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                </button>

                {showFontPicker && (
                    <div className="absolute bottom-full left-0 mb-2 py-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 min-w-[150px] max-h-[200px] overflow-y-auto">
                        {FONTS.map(font => (
                            <button
                                key={font.name}
                                onClick={() => handleFontChange(font)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${currentFontName === font.name ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'
                                    }`}
                                style={{ fontFamily: font.value }}
                            >
                                {font.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Font Size */}
            <div className="flex items-center">
                <button
                    className={btnClass}
                    onClick={() => onFontSizeChange?.(Math.max(8, fontSize - 1))}
                    title="Decrease font size"
                >
                    <icons.Minus size={14} />
                </button>
                <span className="text-sm w-8 text-center font-medium text-gray-700">{Math.round(fontSize)}</span>
                <button
                    className={btnClass}
                    onClick={() => onFontSizeChange?.(fontSize + 1)}
                    title="Increase font size"
                >
                    <icons.Plus size={14} />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Text Formatting */}
            <div className="flex items-center gap-0.5">
                <button
                    className={fontWeight >= 700 ? activeBtnClass : btnClass}
                    onClick={handleBold}
                    title="Bold"
                >
                    <icons.Bold size={16} />
                </button>
                <button
                    className={italic ? activeBtnClass : btnClass}
                    onClick={handleItalic}
                    title="Italic"
                >
                    <icons.Italic size={16} />
                </button>
                <button
                    className={underline ? activeBtnClass : btnClass}
                    onClick={handleUnderline}
                    title="Underline"
                >
                    <icons.Underline size={16} />
                </button>
                <button
                    className={btnClass}
                    onClick={handleStrikethrough}
                    title="Strikethrough"
                >
                    <icons.Strikethrough size={16} />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Alignment */}
            <div className="flex items-center gap-0.5">
                <button
                    className={align === 'left' ? activeBtnClass : btnClass}
                    onClick={() => onAlignChange?.('left')}
                    title="Align Left"
                >
                    <icons.AlignLeft size={16} />
                </button>
                <button
                    className={align === 'center' ? activeBtnClass : btnClass}
                    onClick={() => onAlignChange?.('center')}
                    title="Align Center"
                >
                    <icons.AlignCenter size={16} />
                </button>
                <button
                    className={align === 'right' ? activeBtnClass : btnClass}
                    onClick={() => onAlignChange?.('right')}
                    title="Align Right"
                >
                    <icons.AlignRight size={16} />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Color Picker */}
            <div className="relative">
                <button
                    className={btnClass}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Text Color"
                >
                    <div className="flex flex-col items-center gap-0.5">
                        <icons.Palette size={16} />
                        <div
                            className="w-4 h-1 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                    </div>
                </button>

                {showColorPicker && (
                    <div
                        className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-xl shadow-2xl border border-gray-100 z-50"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <div className="grid grid-cols-5 gap-1.5 mb-2">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor}
                                    className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${color === presetColor ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
                                        }`}
                                    style={{ backgroundColor: presetColor }}
                                    onClick={() => handleColorChange(presetColor)}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                onBlur={() => handleColorChange(customColor, false)}
                                className="w-7 h-7 cursor-pointer border-0 p-0 rounded"
                            />
                            <span className="text-xs text-gray-500">Custom</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
