import {
  ChevronRight, Bot, FileText, Wand2, Loader2, Send, Copy, Check,
  Sparkles, Pencil, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAIChat, useAISummarize, useAIRewrite } from "@/hooks/api";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage, AISummaryLength, AIRewriteTone } from "@/types";
import { queryDocument, type RAGSource } from "@/lib/ai/rag-client";
import { SemanticDocument, SemanticSection } from "@/lib/semantic/types";

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  documentText?: string;
  documentId?: string;
  isIndexing?: boolean;
  isIndexed?: boolean;
  semanticDoc?: SemanticDocument | null;
  onUpdateSection?: (id: string, content: string) => void;
}

export const RightSidebar = ({
  isOpen,
  onToggle,
  documentText = '',
  documentId,
  isIndexing = false,
  isIndexed = false,
  semanticDoc,
  onUpdateSection,
}: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'rewrite' | 'edit'>('chat');
  const { isGuest } = useAuth();

  // AI Hooks
  const { mutate: chat } = useAIChat();
  const { mutate: summarize, isPending: summaryLoadingHook } = useAISummarize();
  const { mutate: rewrite, isPending: rewriteLoadingHook } = useAIRewrite();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [lastSources, setLastSources] = useState<RAGSource[]>([]);
  const [showSources, setShowSources] = useState(false);

  // Summary state
  const [summary, setSummary] = useState("");
  const [summaryLength, setSummaryLength] = useState<AISummaryLength>('brief');
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Rewrite state
  const [selectedText, setSelectedText] = useState("");
  const [rewriteTone, setRewriteTone] = useState<AIRewriteTone>('formal');
  const [rewriteSuggestions, setRewriteSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Semantic Edit state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ragLoading]);

  // Listen for text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    };
    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // ========== Chat ==========
  const handleSendMessage = async () => {
    if (!chatInput.trim() || ragLoading) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setLastSources([]);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    if (!isIndexed || !documentId) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isIndexing
          ? 'Please wait, the document is still being indexed for AI search...'
          : 'This document hasn\'t been indexed yet. Please reload or try again in a moment.'
      }]);
      return;
    }

    setRagLoading(true);
    try {
      const result = await queryDocument(documentId, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
      if (result.sources && result.sources.length > 0) {
        setLastSources(result.sources);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error: ' + err.message }]);
    } finally {
      setRagLoading(false);
    }
  };

  // ========== Summary ==========
  const handleSummarize = () => {
    if (!documentText) return toast.error('No document loaded');
    setSummary("");
    summarize({ documentText, length: summaryLength }, {
      onSuccess: (data) => setSummary(data.summary)
    });
  };

  // ========== Rewrite ==========
  const handleRewrite = () => {
    if (!selectedText) return toast.error('Select text first');
    setRewriteSuggestions([]);
    rewrite({ text: selectedText, tone: rewriteTone }, {
      onSuccess: (data) => setRewriteSuggestions(data.suggestions)
    });
  };

  // ========== Edit ==========
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

  // ============================================================
  // Collapsed state — icon strip
  // ============================================================
  if (!isOpen) {
    return (
      <div className="w-14 border-l bg-background flex flex-col items-center py-4 gap-4 z-20 h-full">
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-10 w-10 text-muted-foreground hover:text-primary mb-2" title="Expand AI Copilot">
          <Sparkles className="h-5 w-5" />
        </Button>
        <div className="w-8 h-px bg-border/50" />
        {([
          { id: 'chat' as const, icon: Bot, color: 'text-blue-500' },
          { id: 'summary' as const, icon: FileText, color: 'text-orange-500' },
          { id: 'rewrite' as const, icon: Wand2, color: 'text-purple-500' },
          { id: 'edit' as const, icon: Pencil, color: 'text-green-500' },
        ]).map(({ id, icon: Icon, color }) => (
          <Button
            key={id}
            variant={activeTab === id ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => { setActiveTab(id); onToggle(); }}
            className={cn(
              "h-10 w-10 rounded-xl transition-all hover:scale-105",
              activeTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            title={id.charAt(0).toUpperCase() + id.slice(1)}
          >
            <Icon className={cn("h-5 w-5", activeTab === id && color)} />
          </Button>
        ))}
      </div>
    );
  }

  // ============================================================
  // Expanded state
  // ============================================================
  return (
    <aside className="w-full border-l bg-card flex flex-col shrink-0 h-full shadow-soft z-20">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Copilot</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", isIndexed ? "bg-green-500" : "bg-amber-400 animate-pulse")} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{isIndexed ? 'Ready' : 'Indexing'}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex p-1 mx-3 mt-3 mb-1 bg-muted/40 rounded-xl border border-border/50 shrink-0">
        {([
          { id: 'chat' as const, label: 'Chat', icon: Bot },
          { id: 'summary' as const, label: 'Summary', icon: FileText },
          { id: 'rewrite' as const, label: 'Rewrite', icon: Wand2 },
          { id: 'edit' as const, label: 'Edit', icon: Pencil },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all rounded-lg",
              activeTab === id
                ? "bg-white text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Guest lockscreen */}
      {isGuest && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-background/80 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Features Locked</h3>
            <p className="text-sm text-muted-foreground mt-2">Sign in to access AI chat, semantic editing, and rewriting tools.</p>
          </div>
          <Button className="w-full" asChild>
            <a href="/login">Sign In to Unlock</a>
          </Button>
        </div>
      )}

      {/* ============================== */}
      {/* Tab Content — fills remaining  */}
      {/* ============================== */}
      {!isGuest && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* ===== CHAT ===== */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Gemini AI</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about your document! I can help explain content, find information, or answer questions.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                        msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}

                {ragLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{isIndexed ? 'Searching...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}

                {/* Sources */}
                {lastSources.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className="w-full px-3 py-2 bg-muted/50 flex items-center justify-between text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        {lastSources.length} source{lastSources.length > 1 ? 's' : ''} found
                      </span>
                      <ChevronRight className={cn("h-3 w-3 transition-transform", showSources && "rotate-90")} />
                    </button>
                    {showSources && (
                      <div className="divide-y">
                        {lastSources.map((source, i) => (
                          <div key={source.id} className="p-2 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                              <span className="font-medium">Source {i + 1}</span>
                              {source.pageNumber && <span>• Page {source.pageNumber}</span>}
                              <span>• {Math.round(source.similarity * 100)}% match</span>
                            </div>
                            <p className="text-foreground/80 line-clamp-3">{source.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t p-3 shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={isIndexed ? "Ask with Smart Search..." : "Ask about this PDF..."}
                    className="flex-1 text-sm min-h-[40px] max-h-[120px] resize-none"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={ragLoading}
                  />
                  <Button size="sm" onClick={handleSendMessage} disabled={ragLoading || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== SUMMARY ===== */}
          {activeTab === 'summary' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
              <div className="flex gap-2 shrink-0">
                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value as AISummaryLength)}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                >
                  <option value="brief">Brief (~150 words)</option>
                  <option value="detailed">Detailed (~400 words)</option>
                </select>
                <Button onClick={handleSummarize} disabled={summaryLoadingHook || !documentText}>
                  {summaryLoadingHook ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {summary ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(summary);
                      setSummaryCopied(true);
                      setTimeout(() => setSummaryCopied(false), 2000);
                    }}>
                      {summaryCopied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Generate a summary of your document</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== REWRITE ===== */}
          {activeTab === 'rewrite' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
              <div className="space-y-2 shrink-0">
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedText
                    ? `"${selectedText.slice(0, 60)}${selectedText.length > 60 ? '...' : ''}"`
                    : 'Select text in the document'}
                </p>

                <div className="flex gap-1 flex-wrap">
                  {(['formal', 'casual', 'concise', 'detailed'] as const).map((tone) => (
                    <Button
                      key={tone}
                      variant={rewriteTone === tone ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRewriteTone(tone)}
                      className="text-xs"
                    >
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </Button>
                  ))}
                </div>

                <Button onClick={handleRewrite} disabled={rewriteLoadingHook || !selectedText} className="w-full">
                  {rewriteLoadingHook ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" /> Rewrite</>
                  )}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {rewriteSuggestions.length > 0 ? (
                  <div className="space-y-3 pb-2">
                    {rewriteSuggestions.map((suggestion, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg space-y-2">
                        <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
                        <Button variant="ghost" size="sm" onClick={() => {
                          navigator.clipboard.writeText(suggestion);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}>
                          {copiedIndex === i ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wand2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Select text and choose a tone to rewrite</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== EDIT ===== */}
          {activeTab === 'edit' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
              <div className="flex items-center justify-between shrink-0">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Document Sections</h4>
                {editingSectionId && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)} className="h-7 px-2 text-xs text-muted-foreground">
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
              </div>

              {editingSectionId ? (
                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  <div className="flex-1 bg-background border border-primary/30 rounded-lg overflow-hidden flex flex-col min-h-0">
                    <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase">Editor</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{editingSectionId}</span>
                    </div>
                    <Textarea
                      className="flex-1 border-0 resize-none font-mono text-[13px] leading-relaxed p-4 focus-visible:ring-0 bg-transparent"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>
                  <Button onClick={saveEdit} className="w-full shrink-0">
                    Apply Changes
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="space-y-2 pb-4">
                    {!semanticDoc && (
                      <div className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 opacity-20" />
                        <p className="text-xs text-muted-foreground">Loading Structure...</p>
                      </div>
                    )}
                    {semanticDoc?.structure.sections.map(section => (
                      <button
                        key={section.id}
                        onClick={() => startEditing(section)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:shadow-sm transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            section.type === 'heading' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {section.type}
                          </span>
                          <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{section.content}</p>
                        {section.type === 'heading' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </aside>
  );
};
