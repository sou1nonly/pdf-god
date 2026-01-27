import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NewDocumentFormProps {
    onCreateDocument: (width: number, height: number) => Promise<void>;
    isCreating?: boolean;
}

// Standard page sizes in points (72 points = 1 inch)
const PAGE_SIZES = {
    'A4': { width: 595, height: 842, label: 'A4', description: '210 × 297 mm' },
    'Letter': { width: 612, height: 792, label: 'US Letter', description: '8.5 × 11 in' },
    'Legal': { width: 612, height: 1008, label: 'US Legal', description: '8.5 × 14 in' },
    'A3': { width: 842, height: 1191, label: 'A3', description: '297 × 420 mm' },
    'A5': { width: 420, height: 595, label: 'A5', description: '148 × 210 mm' },
    'Tabloid': { width: 792, height: 1224, label: 'Tabloid', description: '11 × 17 in' },
};

type PageSizeKey = keyof typeof PAGE_SIZES;
type Orientation = 'portrait' | 'landscape';

export function NewDocumentForm({ onCreateDocument, isCreating = false }: NewDocumentFormProps) {
    const [selectedSize, setSelectedSize] = useState<PageSizeKey>('A4');
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [isCustom, setIsCustom] = useState(false);
    const [customWidth, setCustomWidth] = useState(595);
    const [customHeight, setCustomHeight] = useState(842);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        let width: number, height: number;

        if (isCustom) {
            width = customWidth;
            height = customHeight;
        } else {
            const size = PAGE_SIZES[selectedSize];
            if (orientation === 'landscape') {
                width = size.height;
                height = size.width;
            } else {
                width = size.width;
                height = size.height;
            }
        }

        setLoading(true);
        try {
            await onCreateDocument(width, height);
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = loading || isCreating;

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">New Document</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose your page settings</p>
            </div>

            {/* Orientation */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-foreground mb-2 block">Orientation</Label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setOrientation('portrait')}
                        disabled={isDisabled}
                        className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors cursor-pointer",
                            orientation === 'portrait'
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-muted-foreground/30"
                        )}
                    >
                        <div className="h-10 w-7 rounded border-2 border-current" />
                        <span className="text-sm font-medium">Portrait</span>
                    </button>
                    <button
                        onClick={() => setOrientation('landscape')}
                        disabled={isDisabled}
                        className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors cursor-pointer",
                            orientation === 'landscape'
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-muted-foreground/30"
                        )}
                    >
                        <div className="h-7 w-10 rounded border-2 border-current" />
                        <span className="text-sm font-medium">Landscape</span>
                    </button>
                </div>
            </div>

            {/* Page Size */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-foreground mb-2 block">Page Size</Label>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(PAGE_SIZES) as PageSizeKey[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                setSelectedSize(key);
                                setIsCustom(false);
                            }}
                            disabled={isDisabled}
                            className={cn(
                                "p-3 rounded-lg border transition-colors text-center cursor-pointer",
                                selectedSize === key && !isCustom
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-muted-foreground/30"
                            )}
                        >
                            <div className="text-sm font-medium">{PAGE_SIZES[key].label}</div>
                            <div className="text-xs text-muted-foreground">{PAGE_SIZES[key].description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Size */}
            <div className="mb-6">
                <button
                    onClick={() => setIsCustom(!isCustom)}
                    disabled={isDisabled}
                    className={cn(
                        "w-full p-3 rounded-lg border transition-colors text-sm font-medium cursor-pointer",
                        isCustom
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                >
                    Custom Size
                </button>

                {isCustom && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Width (pt)</Label>
                            <Input
                                type="number"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(Number(e.target.value))}
                                className="mt-1"
                                min={100}
                                max={5000}
                                disabled={isDisabled}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Height (pt)</Label>
                            <Input
                                type="number"
                                value={customHeight}
                                onChange={(e) => setCustomHeight(Number(e.target.value))}
                                className="mt-1"
                                min={100}
                                max={5000}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Create Button */}
            <Button
                onClick={handleCreate}
                className="w-full"
                size="lg"
                disabled={isDisabled}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                    </>
                ) : (
                    'Create Document'
                )}
            </Button>
        </div>
    );
}
