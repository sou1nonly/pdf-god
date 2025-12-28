import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from "@/components/ui/slider";
import { PRESET_COLORS as COLORS } from '@/lib/editor/constants';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '@/lib/editor/color-utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Pipette } from 'lucide-react';



// --- Components ---

const CustomColorPicker = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
    // Parse initial color - use refs to track internal HSV state to avoid re-calc on every render
    // but we need to react to external color changes if they are NOT from us dragging.
    // Actually, standard controlled component pattern is fine if fast enough.
    const rgb = hexToRgb(color);

    // Initialize HSV from props only initially or when not dragging?
    // If we fully control HSV, we can ignore incoming hex prop while dragging?
    // Let's use local state for HSV which acts as source of truth.
    const [hsv, setHsv] = useState(() => rgbToHsv(rgb.r, rgb.g, rgb.b));

    const rectRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const [isDraggingRect, setIsDraggingRect] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);

    // Sync HSV from props if color changes externally and significantly (e.g. undo)
    // We need to avoid loops where our update triggers prop update which triggers effect.
    // A simple check is to compare converted rgb.
    useEffect(() => {
        if (!isDraggingRect && !isDraggingHue) {
            const newRgb = hexToRgb(color);
            const currentRgb = hsvToRgb(hsv.h, hsv.s / 100, hsv.v / 100);
            // Approximate comparison
            if (Math.abs(newRgb.r - currentRgb.r) > 2 || Math.abs(newRgb.g - currentRgb.g) > 2 || Math.abs(newRgb.b - currentRgb.b) > 2) {
                setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
            }
        }
    }, [color]); // Remove isDragging deps to avoid re-running when drag starts/stops unnecessarily

    const handleRectMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!rectRef.current) return;
        const rect = rectRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        // S: 0-100, V: 0-100
        const newS = x * 100;
        const newV = (1 - y) * 100;

        setHsv(prev => {
            const next = { ...prev, s: newS, v: newV };
            const newRgb = hsvToRgb(next.h, next.s / 100, next.v / 100);
            onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
            return next;
        });
    }, [onChange]);

    const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        const newH = x * 360;

        setHsv(prev => {
            const next = { ...prev, h: newH };
            const newRgb = hsvToRgb(next.h, next.s / 100, next.v / 100);
            onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
            return next;
        });
    }, [onChange]);

    // Global Mouse Listeners for Dragging
    useEffect(() => {
        const handleUp = () => {
            setIsDraggingRect(false);
            setIsDraggingHue(false);
        };
        const handleMove = (e: MouseEvent) => {
            if (isDraggingRect) handleRectMove(e);
            if (isDraggingHue) handleHueMove(e);
        };

        if (isDraggingRect || isDraggingHue) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isDraggingRect, isDraggingHue, handleRectMove, handleHueMove]);

    const rgbVal = hsvToRgb(hsv.h, hsv.s / 100, hsv.v / 100);

    const handleEyeDropper = async () => {
        if (!(window as any).EyeDropper) return;
        try {
            const eyeDropper = new (window as any).EyeDropper();
            const result = await eyeDropper.open();
            // Update HSV and Color
            const hex = result.sRGBHex;
            const rgb = hexToRgb(hex);
            setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
            onChange(hex);
        } catch (e) {
            // User canceled
        }
    };

    return (
        <div className="w-56 p-2 space-y-3">
            {/* Saturation/Value Area */}
            <div
                ref={rectRef}
                className="w-full h-32 rounded-md cursor-crosshair relative shadow-inner overflow-hidden"
                style={{
                    backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                    backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
                }}
                onMouseDown={(e) => { setIsDraggingRect(true); handleRectMove(e); }}
            >
                <div
                    className="absolute w-3 h-3 border-2 border-white rounded-full shadow-sm -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                    style={{
                        left: `${hsv.s}%`,
                        top: `${100 - hsv.v}%`,
                        borderColor: hsv.v < 50 ? 'white' : 'black'
                    }}
                />
            </div>

            <div className="flex gap-2 items-center">
                {/* Eye Dropper */}
                {(window as any).EyeDropper && (
                    <button onClick={handleEyeDropper} className="p-1.5 rounded-md hover:bg-muted text-foreground/70">
                        <Pipette size={16} />
                    </button>
                )}

                {/* Selected Color Preview */}
                <div className="w-8 h-8 rounded-full border border-border shadow-sm shrink-0" style={{ backgroundColor: color }} />

                {/* Hue Slider */}
                <div
                    ref={hueRef}
                    className="flex-1 h-3 rounded-full cursor-pointer relative"
                    style={{
                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                    }}
                    onMouseDown={(e) => { setIsDraggingHue(true); handleHueMove(e); }}
                >
                    <div
                        className="absolute w-3 h-3 bg-white border border-black/20 rounded-full shadow-sm -translate-x-1.5 top-0 pointer-events-none"
                        style={{ left: `${(hsv.h / 360) * 100}%` }}
                    />
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-3 gap-2">
                {['r', 'g', 'b'].map((channel) => (
                    <div key={channel} className="text-center">
                        <input
                            className="w-full rounded-md border text-center text-xs h-6"
                            value={(rgbVal as any)[channel]}
                            onChange={(e) => {
                                const val = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                                const newRgb = { ...rgbVal, [channel]: val };
                                onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                            }}
                        />
                        <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{channel}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Swatch Component (Extracted)
const ColorSwatch = React.memo(({
    color,
    isSelected,
    onChange,
    isTransparent = false,
    isCustom = false
}: {
    color: string,
    isSelected: boolean,
    onChange: (c: string) => void,
    isTransparent?: boolean,
    isCustom?: boolean
}) => {

    if (isCustom) {
        // Use Popover for Custom Picker
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-110 relative overflow-hidden flex items-center justify-center shadow-sm",
                            "bg-gradient-to-tr from-rose-500 via-purple-500 to-blue-500",
                            isSelected && "ring-2 ring-blue-500 ring-offset-2 border-transparent"
                        )}
                        title="Custom Color"
                    />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none bg-white rounded-xl shadow-2xl" side="top" sideOffset={16}>
                    <CustomColorPicker color={isSelected ? color : '#000000'} onChange={onChange} />
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <button
            onClick={() => onChange(color)}
            className={cn(
                "w-5 h-5 rounded-full border border-black/10 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 relative overflow-hidden",
                isSelected && "ring-2 ring-blue-500 ring-offset-2 border-transparent"
            )}
            style={{
                backgroundColor: isTransparent ? 'white' : color,
                backgroundImage: isTransparent
                    ? 'conic-gradient(#eee 0 25%, white 0 50%, #eee 0 75%, white 0)'
                    : 'none',
                backgroundSize: isTransparent ? '6px 6px' : undefined
            }}
            title={isTransparent ? 'Transparent' : color}
        >
            {isTransparent && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[120%] h-px bg-red-500 rotate-45 transform origin-center opacity-80"></div>
                </div>
            )}
        </button>
    );
});
ColorSwatch.displayName = "ColorSwatch";

// --- Main Export ---

interface ColorPanelProps {
    strokeColor: string;
    onStrokeColorChange: (color: string) => void;
    fillColor: string;
    onFillColorChange: (color: string) => void;
    strokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    opacity: number;
    onOpacityChange: (opacity: number) => void;
}



export const ColorPanel: React.FC<ColorPanelProps> = ({
    strokeColor,
    onStrokeColorChange,
    fillColor,
    onFillColorChange,
    strokeWidth,
    onStrokeWidthChange,
    opacity,
    onOpacityChange,
}) => {

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-full shadow-2xl border border-gray-200/50 p-2 px-6 flex items-center gap-6 z-[100] h-14 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Stroke Section */}
            <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide cursor-default pointer-events-none select-none">Stroke</span>
                <div className="flex items-center gap-1.5">
                    {COLORS.map((c) => (
                        <ColorSwatch
                            key={c}
                            color={c}
                            isSelected={strokeColor === c}
                            onChange={onStrokeColorChange}
                        />
                    ))}
                    <ColorSwatch
                        color={strokeColor}
                        isSelected={!COLORS.includes(strokeColor) && strokeColor !== 'transparent'}
                        onChange={onStrokeColorChange}
                        isCustom
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Fill Section */}
            <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide cursor-default pointer-events-none select-none">Fill</span>
                <div className="flex items-center gap-1.5">
                    <ColorSwatch
                        color="transparent"
                        isSelected={fillColor === 'transparent'}
                        onChange={onFillColorChange}
                        isTransparent
                    />
                    {COLORS.slice(0, 7).map((c) => (
                        <ColorSwatch
                            key={`fill-${c}`}
                            color={c}
                            isSelected={fillColor === c}
                            onChange={onFillColorChange}
                        />
                    ))}
                    <ColorSwatch
                        color={fillColor}
                        isSelected={!COLORS.includes(fillColor) && fillColor !== 'transparent'}
                        onChange={onFillColorChange}
                        isCustom
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Stroke Width */}
            <div className="flex items-center gap-3 min-w-[120px]">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide cursor-default pointer-events-none select-none">Size</span>
                <Slider
                    value={[strokeWidth]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(val) => onStrokeWidthChange(val[0])}
                    className="w-20"
                />
                <span className="text-xs font-medium text-gray-700 w-6 text-right tabular-nums">{strokeWidth}px</span>
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Opacity */}
            <div className="flex items-center gap-3 min-w-[140px]">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide cursor-default pointer-events-none select-none">Opacity</span>
                <Slider
                    value={[opacity]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={(val) => onOpacityChange(val[0])}
                    className="w-20"
                />
                <span className="text-xs font-medium text-gray-700 w-8 text-right tabular-nums">{Math.round(opacity * 100)}%</span>
            </div>
        </div>
    );
};
