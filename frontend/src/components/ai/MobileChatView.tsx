import { useState, useRef, useEffect } from "react";
import {
    Bot, Loader2, Send, Zap,
    FileText, AlertCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queryDocument, type RAGSource } from "@/lib/ai/rag-client";
import type { SemanticDocument, SectionType } from "@/lib/semantic/types";
import {
    callGeminiForEdit, executeActions, type SemanticHookMethods,
} from "@/lib/semantic/ai-tools";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
    role: "user" | "assistant";
    content: string;
    actionSummaries?: string[];
    isEdit?: boolean;
    isError?: boolean;
}

interface MobileChatViewProps {
    documentText?: string;
    documentId?: string;
    isIndexing?: boolean;
    isIndexed?: boolean;
    semanticDoc?: SemanticDocument | null;
    onUpdateSection?: (id: string, content: string) => void;
    onAddSection?: (
        section: { type: SectionType; content: string; typstContent: string; level?: number },
        afterId?: string | null,
    ) => string;
    onDeleteSection?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Quick Action Chips                                                 */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
    { label: "Summarize", prompt: "Summarize this document concisely" },
    { label: "Key Points", prompt: "Extract the key points from this document" },
    { label: "Extract Data", prompt: "Extract the important data and numbers from this document" },
    { label: "Explain", prompt: "Explain this document in simple terms" },
    { label: "Translate", prompt: "Translate this document to English" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const MobileChatView = ({
    documentText = "",
    documentId,
    isIndexing = false,
    isIndexed = false,
    semanticDoc,
    onUpdateSection,
    onAddSection,
    onDeleteSection,
}: MobileChatViewProps) => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [lastSources, setLastSources] = useState<RAGSource[]>([]);
    const [showSources, setShowSources] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const canAIEdit = !!(semanticDoc && onUpdateSection && onAddSection && onDeleteSection);

    // Auto-scroll on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    /* ==================== Send Handler ==================== */

    const handleSendMessage = async (overrideMessage?: string) => {
        const userMessage = (overrideMessage || chatInput).trim();
        if (!userMessage || isThinking) return;

        setChatInput("");
        setLastSources([]);
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsThinking(true);

        try {
            if (canAIEdit && semanticDoc) {
                const result = await callGeminiForEdit(userMessage, semanticDoc.structure.sections);
                if (result.isEdit && result.actions.length > 0) {
                    const hookMethods: SemanticHookMethods = {
                        updateSection: onUpdateSection!,
                        addSection: onAddSection!,
                        deleteSection: onDeleteSection!,
                    };
                    const summaries = executeActions(result.actions, hookMethods);
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: result.message,
                            actionSummaries: summaries,
                            isEdit: true,
                        },
                    ]);
                } else {
                    setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
                }
            } else if (isIndexed && documentId) {
                const result = await queryDocument(documentId, userMessage);
                setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
                if (result.sources?.length) setLastSources(result.sources);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: isIndexing
                            ? "Please wait — the document is still being indexed for AI search."
                            : "This document hasn't been indexed yet. Reload or try again shortly.",
                    },
                ]);
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: err.message || "Something went wrong.",
                    isError: true,
                },
            ]);
        } finally {
            setIsThinking(false);
        }
    };

    /* ==================== Render ==================== */

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Edit Mode Banner */}
            {canAIEdit && (
                <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 shrink-0">
                    <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[12px] font-semibold text-emerald-700">
                            AI can edit your document
                        </span>
                    </div>
                    <p className="text-[11px] text-emerald-600/70 mt-0.5 ml-5.5 leading-relaxed">
                        "Add a section" · "Rewrite the intro" · "Summarize"
                    </p>
                </div>
            )}

            {/* ────── Messages ────── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {/* Welcome */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
                            <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-foreground mb-1">
                            Chat with your PDF
                        </h3>
                        <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[280px]">
                            {canAIEdit
                                ? "I can edit, summarize, rewrite, and answer questions about your document."
                                : "Ask me anything about your document. I'll search for the answer."}
                        </p>
                    </div>
                )}

                {/* Message List */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex animate-fade-in-up",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                        style={{ animationDelay: "0ms", animationDuration: "250ms" }}
                    >
                        {/* User Bubble */}
                        {msg.role === "user" && (
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5">
                                <p className="text-[13px] leading-relaxed">{msg.content}</p>
                            </div>
                        )}

                        {/* Assistant Bubble */}
                        {msg.role === "assistant" && (
                            <div className="max-w-[92%] space-y-1.5">
                                {/* Avatar + name */}
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div
                                        className={cn(
                                            "h-5 w-5 rounded-md flex items-center justify-center",
                                            msg.isError
                                                ? "bg-destructive/10"
                                                : msg.isEdit
                                                    ? "bg-emerald-100"
                                                    : "bg-primary/10"
                                        )}
                                    >
                                        {msg.isError ? (
                                            <AlertCircle className="h-3 w-3 text-destructive" />
                                        ) : msg.isEdit ? (
                                            <Zap className="h-3 w-3 text-emerald-600" />
                                        ) : (
                                            <Bot className="h-3 w-3 text-primary" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                                        {msg.isError ? "ERROR" : msg.isEdit ? "APPLIED" : "GEMINI"}
                                    </span>
                                </div>

                                {/* Message card */}
                                <div
                                    className={cn(
                                        "rounded-xl rounded-tl-md border px-4 py-3",
                                        msg.isError
                                            ? "bg-destructive/5 border-destructive/20"
                                            : msg.isEdit
                                                ? "bg-emerald-50/60 border-emerald-200/50"
                                                : "bg-muted/30 border-border/30"
                                    )}
                                >
                                    <p
                                        className={cn(
                                            "text-[13px] leading-[1.65] whitespace-pre-wrap",
                                            msg.isError ? "text-destructive/80" : "text-foreground/90"
                                        )}
                                    >
                                        {msg.content}
                                    </p>
                                </div>

                                {/* Action badges */}
                                {msg.actionSummaries && msg.actionSummaries.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5 pl-0.5">
                                        {msg.actionSummaries.map((s, j) => (
                                            <span
                                                key={j}
                                                className="inline-flex items-center gap-1 text-[10px] font-medium py-0.5 px-2 rounded-md bg-emerald-100/80 text-emerald-700 border border-emerald-200/50"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                            <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                                THINKING…
                            </span>
                        </div>
                    </div>
                )}

                {/* Sources accordion */}
                {lastSources.length > 0 && (
                    <div className="rounded-xl border border-border/30 overflow-hidden">
                        <button
                            onClick={() => setShowSources(!showSources)}
                            className="w-full px-3 py-2.5 bg-muted/20 flex items-center justify-between text-[12px] font-medium text-muted-foreground active:bg-muted/40 transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                {lastSources.length} source{lastSources.length > 1 ? "s" : ""} found
                            </span>
                            <ChevronRight
                                className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-200",
                                    showSources && "rotate-90"
                                )}
                            />
                        </button>
                        {showSources && (
                            <div className="divide-y divide-border/20">
                                {lastSources.map((src, i) => (
                                    <div key={src.id} className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                                            <span className="font-semibold">Source {i + 1}</span>
                                            {src.pageNumber && (
                                                <span className="opacity-60">· Page {src.pageNumber}</span>
                                            )}
                                            <span className="opacity-60">
                                                · {Math.round((src.similarity || 0) * 100)}%
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-foreground/70 line-clamp-2 leading-relaxed">
                                            {src.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* ────── Quick Actions (only when no messages) ────── */}
            {messages.length === 0 && (
                <div className="px-3 pb-2 shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {QUICK_ACTIONS.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => handleSendMessage(action.prompt)}
                                className="flex-none px-3.5 py-2 rounded-xl border border-border/40 bg-card text-[12px] font-medium text-foreground/80
                  active:bg-primary/10 active:border-primary/30 active:text-primary
                  transition-all cursor-pointer whitespace-nowrap shadow-layer-sm"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ────── Input ────── */}
            <div className="border-t border-border/30 p-3 shrink-0 bg-card/60 backdrop-blur-sm">
                <div className="flex gap-2 items-end">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={canAIEdit ? "Edit, summarize, or ask…" : "Ask about this PDF…"}
                        className="flex-1 h-10 px-4 text-[13px] rounded-xl border border-border/40 bg-muted/20
              placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40
              transition-all"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={isThinking}
                    />
                    <Button
                        size="icon"
                        onClick={() => handleSendMessage()}
                        disabled={isThinking || !chatInput.trim()}
                        className="h-10 w-10 rounded-xl shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
