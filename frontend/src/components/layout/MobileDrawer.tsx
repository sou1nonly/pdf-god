import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface MobileDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    side: 'left' | 'right';
}

export const MobileDrawer = ({ isOpen, onOpenChange, children, side }: MobileDrawerProps) => {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side={side} className="p-0 w-[85%] sm:max-w-[400px] overflow-hidden">
                {children}
            </SheetContent>
        </Sheet>
    );
};
