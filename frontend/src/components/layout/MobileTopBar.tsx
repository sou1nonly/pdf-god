import { ArrowLeft, MoreVertical, FileDown, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface MobileTopBarProps {
    fileName: string;
    onSave?: () => void;
    onDownload?: () => void;
    hasUnsavedChanges?: boolean;
    isSaving?: boolean;
}

export const MobileTopBar = ({
    fileName,
    onSave,
    onDownload,
    hasUnsavedChanges = false,
    isSaving = false,
}: MobileTopBarProps) => {
    const navigate = useNavigate();

    return (
        <header className="h-12 border-b border-border/40 bg-card/80 backdrop-blur-md flex items-center px-2 gap-1 shrink-0 z-30">
            {/* Back Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
            >
                <ArrowLeft className="h-4.5 w-4.5" />
            </Button>

            {/* File Name - Center */}
            <div className="flex-1 min-w-0 px-1">
                <p className="text-[13px] font-semibold text-foreground truncate text-center">
                    {fileName.length > 24 ? fileName.slice(0, 24) + "…" : fileName}
                </p>
            </div>

            {/* Unsaved indicator dot */}
            {hasUnsavedChanges && (
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}

            {/* Overflow Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0"
                    >
                        <MoreVertical className="h-4.5 w-4.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-xl border border-border/40 shadow-layer-md p-1"
                >
                    <DropdownMenuItem
                        onClick={onSave}
                        disabled={isSaving}
                        className="cursor-pointer rounded-lg gap-2.5 text-[13px]"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isSaving ? "Saving…" : "Save to Cloud"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={onDownload}
                        className="cursor-pointer rounded-lg gap-2.5 text-[13px]"
                    >
                        <FileDown className="h-4 w-4" />
                        Download PDF
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
};
