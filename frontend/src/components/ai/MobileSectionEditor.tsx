import { useState } from "react";
import {
    Pencil, X, Loader2, Check, Heading, Type,
    List, Table, Image, ChevronRight, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SemanticDocument, SemanticSection, SectionType } from "@/lib/semantic/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MobileSectionEditorProps {
    semanticDoc?: SemanticDocument | null;
    onUpdateSection?: (id: string, content: string) => void;
    onDeleteSection?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SECTION_ICON: Record<string, typeof Type> = {
    heading: Heading,
    paragraph: Type,
    list: List,
    "list-item": List,
    table: Table,
    image: Image,
};

const SECTION_COLORS: Record<string, string> = {
    heading: "bg-primary/10 text-primary",
    paragraph: "bg-muted text-muted-foreground",
    list: "bg-amber-100 text-amber-700",
    "list-item": "bg-amber-50 text-amber-600",
    table: "bg-emerald-100 text-emerald-700",
    image: "bg-violet-100 text-violet-700",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const MobileSectionEditor = ({
    semanticDoc,
    onUpdateSection,
    onDeleteSection,
}: MobileSectionEditorProps) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const startEditing = (section: SemanticSection) => {
        setEditingId(section.id);
        setEditContent(section.typstContent);
    };

    const saveEdit = () => {
        if (editingId && onUpdateSection) {
            onUpdateSection(editingId, editContent);
            toast.success("Section updated");
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent("");
    };

    const sections = semanticDoc?.structure.sections || [];

    /* ————— Loading ————— */
    if (!semanticDoc) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30 mb-3" />
                <p className="text-[12px] text-muted-foreground/60">Loading document structure…</p>
            </div>
        );
    }

    /* ————— Empty ————— */
    if (sections.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Pencil className="h-6 w-6 text-muted-foreground/30 mb-3" />
                <p className="text-[13px] font-medium text-foreground">No editable sections</p>
                <p className="text-[12px] text-muted-foreground mt-1">
                    This document doesn't have editable semantic sections yet.
                </p>
            </div>
        );
    }

    /* ————— Inline Editor ————— */
    if (editingId) {
        const section = sections.find((s) => s.id === editingId);
        const SectionIcon = SECTION_ICON[section?.type || "paragraph"] || Type;

        return (
            <div className="flex-1 flex flex-col min-h-0 p-3 gap-2.5">
                {/* Editor Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", SECTION_COLORS[section?.type || "paragraph"])}>
                            <SectionIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Editing {section?.type}
                        </span>
                    </div>
                    <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                </div>

                {/* Textarea */}
                <div className="flex-1 rounded-xl border border-primary/20 bg-background overflow-hidden flex flex-col min-h-0">
                    <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 shrink-0">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Content Editor</span>
                    </div>
                    <textarea
                        className="flex-1 border-0 resize-none text-[13px] leading-relaxed p-3 focus:outline-none bg-transparent w-full"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Save Button */}
                <Button onClick={saveEdit} className="w-full rounded-xl shrink-0">
                    <Check className="h-4 w-4 mr-2" />
                    Apply Changes
                </Button>
            </div>
        );
    }

    /* ————— Section List ————— */
    return (
        <div className="flex-1 flex flex-col min-h-0 p-3">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Document Sections
                </h4>
                <span className="text-[10px] text-muted-foreground/60">{sections.length} sections</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-2 pb-4">
                    {sections.map((section) => {
                        const SectionIcon = SECTION_ICON[section.type] || Type;
                        return (
                            <button
                                key={section.id}
                                onClick={() => startEditing(section)}
                                className={cn(
                                    "w-full text-left rounded-xl border bg-background transition-all group relative overflow-hidden cursor-pointer",
                                    "border-border/30 active:border-primary/40 active:bg-primary/5",
                                    "p-3"
                                )}
                            >
                                {/* Section type badge */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("h-5 w-5 rounded flex items-center justify-center", SECTION_COLORS[section.type] || "bg-muted text-muted-foreground")}>
                                            <SectionIcon className="h-3 w-3" />
                                        </div>
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-wider",
                                            SECTION_COLORS[section.type]?.includes("text-") ? SECTION_COLORS[section.type].split(" ").find(c => c.startsWith("text-")) : "text-muted-foreground"
                                        )}>
                                            {section.type}{section.level ? ` ${section.level}` : ""}
                                        </span>
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                                </div>

                                {/* Content preview */}
                                <p className="text-[12px] text-foreground/80 line-clamp-2 leading-snug">
                                    {section.content || "(empty)"}
                                </p>

                                {/* Heading accent */}
                                {section.type === "heading" && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-primary/60" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
