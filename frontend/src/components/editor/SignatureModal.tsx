import React, { useRef, useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Pen } from 'lucide-react';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
    isOpen,
    onClose,
    onSave,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    // Initialize canvas
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                setIsEmpty(true);

                // Clear canvas on open
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsDrawing(true);
        setIsEmpty(false);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get coords
        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Trim functionality could be added here, but saving full canvas for now
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Signature</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="border rounded-xl overflow-hidden bg-white shadow-sm touch-none">
                        <canvas
                            ref={canvasRef}
                            width={450}
                            height={200}
                            className="w-full h-[200px] cursor-crosshair touch-none bg-white"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        Draw your signature above
                    </p>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button variant="outline" onClick={clearSignature} type="button" className="gap-2">
                        <Eraser size={16} />
                        Clear
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isEmpty} type="button" className="gap-2 bg-pastel-purple text-purple-900 hover:bg-pastel-purple-dark">
                            <Pen size={16} />
                            Add Signature
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
