import {
  ChevronRight, Bot, Loader2, Send,
  Sparkles, Pencil, X, Zap, FileText,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { queryDocument, type RAGSource } from "@/lib/ai/rag-client";
import { SemanticDocument, SemanticSection, SectionType } from "@/lib/semantic/types";
import { callGeminiForEdit, executeActions, type SemanticHookMethods } from "@/lib/semantic/ai-tools";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  actionSummaries?: string[];
  isEdit?: boolean;
  isError?: boolean;
}

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  documentText?: string;
  documentId?: string;
  isIndexing?: boolean;
  isIndexed?: boolean;
  semanticDoc?: SemanticDocument | null;
  onUpdateSection?: (id: string, content: string) => void;
  onAddSection?: (section: { type: SectionType; content: string; typstContent: string; level?: number }, afterId?: string | null) => string;
  onDeleteSection?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const RightSidebar = ({
  isOpen,
  onToggle,
  documentText = '',
  documentId,
  isIndexing = false,
  isIndexed = false,
  semanticDoc,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
}: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'edit'>('chat');
  const { isGuest } = useAuth();

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [lastSources, setLastSources] = useState<RAGSource[]>([]);
  const [showSources, setShowSources] = useState(false);

  // Edit
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const canAIEdit = !!(semanticDoc && onUpdateSection && onAddSection && onDeleteSection);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  /* ==================== Chat Handler ==================== */

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isThinking) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setLastSources([]);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
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
          setMessages(prev => [...prev, {
            role: 'assistant', content: result.message,
            actionSummaries: summaries, isEdit: true,
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
        }
      } else if (isIndexed && documentId) {
        const result = await queryDocument(documentId, userMessage);
        setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
        if (result.sources?.length) setLastSources(result.sources);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isIndexing
            ? 'Please wait — the document is still being indexed for AI search.'
            : 'This document hasn\'t been indexed yet. Reload or try again shortly.',
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'Something went wrong.',
        isError: true,
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  /* ==================== Edit Handlers ==================== */

  const startEditing = (section: SemanticSection) => {
    setEditingSectionId(section.id);
    setEditContent(section.typstContent);
    setActiveTab('edit');
  };

  const saveEdit = () => {
    if (editingSectionId && onUpdateSection) {
      onUpdateSection(editingSectionId, editContent);
      toast.success("Section updated!");
      setEditingSectionId(null);
    }
  };

  /* ================================================================ */
  /*  Collapsed                                                        */
  /* ================================================================ */

  if (!isOpen) {
    return (
      <div className="w-14 border-l border-border/40 bg-background flex flex-col items-center py-4 gap-3 z-20 h-full">
        <Button variant="ghost" size="icon" onClick={onToggle}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="Expand AI Copilot">
          <Sparkles className="h-4.5 w-4.5" />
        </Button>

        <div className="w-7 h-px bg-border/30 my-1" />

        {([
          { id: 'chat' as const, icon: Bot },
          { id: 'edit' as const, icon: Pencil },
        ]).map(({ id, icon: Icon }) => (
          <Button key={id} variant="ghost" size="icon"
            onClick={() => { setActiveTab(id); onToggle(); }}
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              activeTab === id
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
    );
  }

  /* ================================================================ */
  /*  Expanded                                                         */
  /* ================================================================ */

  return (
    <aside className="w-full border-l border-border/40 bg-card flex flex-col shrink-0 h-full z-20">

      {/* ────── Header ────── */}
      <div className="h-[52px] border-b border-border/40 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="leading-none">
            <h3 className="font-semibold text-[13px] text-foreground">AI Copilot</h3>
            <div className="flex items-center gap-1.5 mt-1">
              {canAIEdit ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 tracking-wide">EDIT MODE</span>
                </>
              ) : (
                <>
                  <div className={cn("h-1.5 w-1.5 rounded-full", isIndexed ? "bg-emerald-500" : "bg-amber-400 animate-pulse")} />
                  <span className="text-[10px] font-medium text-muted-foreground tracking-wide">{isIndexed ? 'READY' : 'INDEXING'}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle}
          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ────── Tab Bar ────── */}
      <div className="flex p-1 mx-3 mt-3 mb-2 bg-muted/30 rounded-lg border border-border/30 shrink-0">
        {([
          { id: 'chat' as const, label: 'Chat', icon: Bot },
          { id: 'edit' as const, label: 'Edit', icon: Pencil },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-1.5 px-3 text-[11px] font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all",
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

      {/* ────── Guest Lockscreen ────── */}
      {isGuest && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-foreground">AI Features Locked</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Sign in to access AI editing, chat, and more.</p>
          </div>
          <Button className="w-full rounded-lg" asChild>
            <a href="/login">Sign In to Unlock</a>
          </Button>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Chat Tab                                                        */}
      {/* ================================================================ */}
      {!isGuest && activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Edit Mode Banner */}
          {canAIEdit && (
            <div className="mx-3 mt-1 mb-1 px-3 py-2 rounded-lg bg-emerald-50/80 border border-emerald-200/60 shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700">AI can edit your document</span>
              </div>
              <p className="text-[10px] text-emerald-600/70 mt-0.5 ml-5 leading-relaxed">
                Try: "Add a Skills section" · "Summarize" · "Rewrite the intro"
              </p>
            </div>
          )}

          {/* ────── Messages ────── */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">

            {/* Welcome */}
            {messages.length === 0 && (
              <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-[12px] font-semibold text-foreground">Gemini AI</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {canAIEdit
                    ? 'I can edit, summarize, rewrite, and answer questions about your document. Just ask!'
                    : 'Ask me anything about your document. I\'ll search for the answer.'}
                </p>
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>

                {/* User Bubble */}
                {msg.role === 'user' && (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2">
                    <p className="text-[12px] leading-relaxed">{msg.content}</p>
                  </div>
                )}

                {/* Assistant Bubble */}
                {msg.role === 'assistant' && (
                  <div className="max-w-[92%] space-y-1.5">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center",
                        msg.isError ? "bg-destructive/10" : msg.isEdit ? "bg-emerald-100" : "bg-primary/10"
                      )}>
                        {msg.isError
                          ? <AlertCircle className="h-3 w-3 text-destructive" />
                          : msg.isEdit
                            ? <Zap className="h-3 w-3 text-emerald-600" />
                            : <Bot className="h-3 w-3 text-primary" />
                        }
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                        {msg.isError ? 'ERROR' : msg.isEdit ? 'APPLIED' : 'GEMINI'}
                      </span>
                    </div>

                    {/* Message card */}
                    <div className={cn(
                      "rounded-xl rounded-tl-md border px-3.5 py-2.5",
                      msg.isError
                        ? "bg-destructive/5 border-destructive/20"
                        : msg.isEdit
                          ? "bg-emerald-50/60 border-emerald-200/50"
                          : "bg-muted/30 border-border/30"
                    )}>
                      <p className={cn(
                        "text-[12px] leading-[1.65] whitespace-pre-wrap",
                        msg.isError ? "text-destructive/80" : "text-foreground/90"
                      )}>
                        {msg.content}
                      </p>
                    </div>

                    {/* Action badges */}
                    {msg.actionSummaries && msg.actionSummaries.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5 pl-0.5">
                        {msg.actionSummaries.map((s, j) => (
                          <span key={j}
                            className="inline-flex items-center gap-1 text-[10px] font-medium py-0.5 px-2 rounded-md bg-emerald-100/80 text-emerald-700 border border-emerald-200/50">
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
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">THINKING</span>
                </div>
              </div>
            )}

            {/* Sources accordion */}
            {lastSources.length > 0 && (
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <button onClick={() => setShowSources(!showSources)}
                  className="w-full px-3 py-2 bg-muted/20 flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    {lastSources.length} source{lastSources.length > 1 ? 's' : ''} found
                  </span>
                  <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", showSources && "rotate-90")} />
                </button>
                {showSources && (
                  <div className="divide-y divide-border/20">
                    {lastSources.map((src, i) => (
                      <div key={src.id} className="px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                          <span className="font-semibold">Source {i + 1}</span>
                          {src.pageNumber && <span className="opacity-60">· Page {src.pageNumber}</span>}
                          <span className="opacity-60">· {Math.round((src.similarity || 0) * 100)}%</span>
                        </div>
                        <p className="text-[11px] text-foreground/70 line-clamp-2 leading-relaxed">{src.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ────── Input ────── */}
          <div className="border-t border-border/30 p-3 shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder={canAIEdit ? "Edit, summarize, rewrite, or ask..." : "Ask about this PDF..."}
                className="flex-1 text-[12px] min-h-[38px] max-h-[100px] resize-none rounded-xl border-border/40 bg-muted/20 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/40"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                disabled={isThinking}
              />
              <Button size="icon" onClick={handleSendMessage} disabled={isThinking || !chatInput.trim()}
                className="h-[38px] w-[38px] rounded-xl shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Edit Tab                                                        */}
      {/* ================================================================ */}
      {!isGuest && activeTab === 'edit' && (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">

          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document Sections</h4>
            {editingSectionId && (
              <button onClick={() => setEditingSectionId(null)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" /> Cancel
              </button>
            )}
          </div>

          {/* Section Editor */}
          {editingSectionId ? (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex-1 rounded-xl border border-primary/20 bg-background overflow-hidden flex flex-col min-h-0">
                <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Typst Editor</span>
                  <span className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[140px]">{editingSectionId}</span>
                </div>
                <Textarea
                  className="flex-1 border-0 resize-none font-mono text-[12px] leading-relaxed p-3 focus-visible:ring-0 bg-transparent"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
              <Button onClick={saveEdit} className="w-full rounded-xl shrink-0">Apply Changes</Button>
            </div>
          ) : (
            /* Section List */
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-2 pb-4">
                {!semanticDoc && (
                  <div className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-[11px] text-muted-foreground/60">Loading structure…</p>
                  </div>
                )}
                {semanticDoc?.structure.sections.map(section => (
                  <button key={section.id} onClick={() => startEditing(section)}
                    className={cn(
                      "w-full text-left rounded-xl border bg-background transition-all group relative overflow-hidden cursor-pointer",
                      "border-border/30 hover:border-primary/30 hover:shadow-sm",
                      "p-3"
                    )}
                  >
                    {/* Section type badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        section.type === 'heading'
                          ? "bg-primary/10 text-primary"
                          : section.type === 'list'
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {section.type}
                      </span>
                      <Pencil className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>

                    {/* Content preview */}
                    <p className="text-[12px] text-foreground/80 line-clamp-2 leading-snug">{section.content}</p>

                    {/* Heading accent bar */}
                    {section.type === 'heading' && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-primary/60" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
