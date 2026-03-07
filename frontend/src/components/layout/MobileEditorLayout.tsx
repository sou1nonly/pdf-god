import { useState } from "react";
import { Bot, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MobilePdfPreview } from "@/components/document/MobilePdfPreview";
import { MobileChatView } from "@/components/ai/MobileChatView";
import { MobileSectionEditor } from "@/components/ai/MobileSectionEditor";
import type { SemanticDocument, SectionType } from "@/lib/semantic/types";

interface MobileEditorLayoutProps {
    fileName: string;
    documentId?: string;
    documentText?: string;
    isIndexing?: boolean;
    isIndexed?: boolean;
    pdfUrl: string | null;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onSave?: () => void;
    onDownload?: () => void;
    hasUnsavedChanges?: boolean;
    isSaving?: boolean;
    semanticDoc?: SemanticDocument | null;
    onUpdateSection?: (id: string, content: string) => void;
    onAddSection?: (
        section: { type: SectionType; content: string; typstContent: string; level?: number },
        afterId?: string | null,
    ) => string;
    onDeleteSection?: (id: string) => void;
}

export const MobileEditorLayout = ({
    fileName,
    documentId,
    documentText,
    isIndexing,
    isIndexed,
    pdfUrl,
    currentPage,
    totalPages,
    onPageChange,
    onSave,
    onDownload,
    hasUnsavedChanges,
    isSaving,
    semanticDoc,
    onUpdateSection,
    onAddSection,
    onDeleteSection,
}: MobileEditorLayoutProps) => {
    const [activeTab, setActiveTab] = useState<"chat" | "edit">("chat");

    return (
        <div className="flex flex-col h-screen w-full bg-background">
            {/* Top Bar */}
            <MobileTopBar
                fileName={fileName}
                onSave={onSave}
                onDownload={onDownload}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
            />

            {/* Collapsible PDF Preview */}
            <MobilePdfPreview
                pdfUrl={pdfUrl}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />

            {/* ────── Tab Bar ────── */}
            <div className="flex p-1 mx-3 mt-2 mb-1 bg-muted/30 rounded-lg border border-border/30 shrink-0">
                {([
                    { id: "chat" as const, label: "Chat", icon: Bot },
                    { id: "edit" as const, label: "Edit", icon: Pencil },
                ]).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            "flex-1 py-2 px-3 text-[12px] font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all cursor-pointer",
                            activeTab === id
                                ? "bg-white text-primary shadow-sm border border-border/30"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ────── Active View ────── */}
            {activeTab === "chat" ? (
                <MobileChatView
                    documentText={documentText}
                    documentId={documentId}
                    isIndexing={isIndexing}
                    isIndexed={isIndexed}
                    semanticDoc={semanticDoc}
                    onUpdateSection={onUpdateSection}
                    onAddSection={onAddSection}
                    onDeleteSection={onDeleteSection}
                />
            ) : (
                <MobileSectionEditor
                    semanticDoc={semanticDoc}
                    onUpdateSection={onUpdateSection}
                    onDeleteSection={onDeleteSection}
                />
            )}
        </div>
    );
};
