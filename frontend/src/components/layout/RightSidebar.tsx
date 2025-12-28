import { ChevronRight, Bot, FileText, Wand2, Loader2, Send, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAIChat, useAISummarize, useAIRewrite, useAIQuestions } from "@/hooks/api";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage, AISummaryLength, AIRewriteTone } from "@lamina/shared";

// Approximate tokens by characters (1 token ≈ 4 chars for English)
const MAX_TOKENS_FOR_QUESTIONS = 2000; // ~8000 chars
const MAX_TOKENS_FOR_CHAT = 4000; // ~16000 chars

/**
 * Truncate text to approximate token limit
 * 1 token ≈ 4 characters for English text
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '... [truncated]';
}

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  documentText?: string;
  currentPageText?: string; // Text from current page only
}

export const RightSidebar = ({
  isOpen,
  onToggle,
  documentText = '',
  currentPageText = '',
}: RightSidebarProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'rewrite'>('chat');
  const { isGuest } = useAuth();

  // AI Hooks
  const { mutate: chat, isPending: chatLoading } = useAIChat();
  const { mutate: summarize, isPending: summaryLoadingHook } = useAISummarize();
  const { mutate: rewrite, isPending: rewriteLoadingHook } = useAIRewrite();
  const { mutate: generateQuestions, isPending: questionsLoading } = useAIQuestions();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Summary state
  const [summary, setSummary] = useState("");
  const [summaryLength, setSummaryLength] = useState<AISummaryLength>('brief');
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [internalSummaryLoading, setInternalSummaryLoading] = useState(false); // To handle optimistic UI if needed

  // Rewrite state
  const [selectedText, setSelectedText] = useState("");
  const [rewriteTone, setRewriteTone] = useState<AIRewriteTone>('formal');
  const [rewriteSuggestions, setRewriteSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Suggested questions
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionsGenerated, setQuestionsGenerated] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

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

  // Generate suggested questions when document loads (limited to ~2000 tokens)
  useEffect(() => {
    if (documentText && documentText.length > 100 && !questionsGenerated && suggestedQuestions.length === 0) {
      const truncatedText = truncateToTokens(documentText, MAX_TOKENS_FOR_QUESTIONS);
      generateQuestions(
        { documentText: truncatedText, count: 3 },
        {
          onSuccess: (data) => {
            setSuggestedQuestions(data.questions.slice(0, 3));
            setQuestionsGenerated(true);
          },
          onError: () => {
            // Silently fail - questions are optional
            setQuestionsGenerated(true);
          }
        }
      );
    }
  }, [documentText, generateQuestions, questionsGenerated, suggestedQuestions.length]);

  // ========== Chat ==========
  const handleSendMessage = () => {
    if (!chatInput.trim() || chatLoading) return;

    // Use current page text if available, otherwise fallback to truncated full doc
    const contextText = currentPageText || truncateToTokens(documentText, MAX_TOKENS_FOR_CHAT);

    if (!contextText) {
      toast.error('No document loaded');
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput("");

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    chat(
      { message: userMessage, documentText: contextText, history: messages },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        },
        onError: (error) => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Sorry, I encountered an error: ' + error.message
          }]);
        }
      }
    );
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatInput(question);
  };

  // ========== Summary ==========
  const handleSummarize = () => {
    if (!documentText) {
      toast.error('No document loaded');
      return;
    }

    setInternalSummaryLoading(true);
    setSummary("");

    summarize(
      { documentText, length: summaryLength },
      {
        onSuccess: (data) => {
          setSummary(data.summary);
          setInternalSummaryLoading(false);
        },
        onError: () => setInternalSummaryLoading(false)
      }
    );
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2000);
  };

  // ========== Rewrite ==========
  const handleRewrite = () => {
    if (!selectedText) {
      toast.error('Please select some text first');
      return;
    }

    setRewriteSuggestions([]);

    rewrite(
      { text: selectedText, tone: rewriteTone },
      {
        onSuccess: (data) => {
          setRewriteSuggestions(data.suggestions);
        }
      }
    );
  };

  const copyRewrite = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Collapsed state - made more noticeable
  // Collapsed state - Icon bar
  if (!isOpen) {
    return (
      <div className="w-14 border-l bg-background flex flex-col items-center py-4 gap-4 z-20 h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-10 w-10 text-muted-foreground hover:text-primary mb-2"
          title="Expand AI Copilot"
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        <div className="w-8 h-px bg-border/50" />

        {([
          { id: 'chat', label: 'Chat', icon: Bot, color: 'text-blue-500' },
          { id: 'summary', label: 'Summary', icon: FileText, color: 'text-orange-500' },
          { id: 'rewrite', label: 'Rewrite', icon: Wand2, color: 'text-purple-500' },
        ] as const).map(({ id, label, icon: Icon, color }) => (
          <Button
            key={id}
            variant={activeTab === id ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              setActiveTab(id);
              onToggle();
            }}
            className={cn(
              "h-10 w-10 rounded-xl transition-all hover:scale-105",
              activeTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            title={label}
          >
            <Icon className={cn("h-5 w-5", activeTab === id && color)} />
          </Button>
        ))}
      </div>
    );
  }

  const isSummaryLoading = summaryLoadingHook || internalSummaryLoading;
  const isRewriteLoading = rewriteLoadingHook;

  return (
    <aside className="w-80 border-l bg-card flex flex-col shrink-0 h-full shadow-soft z-20">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm">AI Copilot</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 mx-4 mt-4 bg-muted/40 rounded-xl border border-border/50">
        {([
          { id: 'chat', label: 'Chat', icon: Bot },
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
        ] as const).map(({ id, label, icon: Icon }) => (
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

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isGuest && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Features Locked</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Sign in to access AI chat, summarization, and rewriting tools.
              </p>
            </div>
            <Button className="w-full" asChild>
              <a href="/login">Sign In to Unlock</a>
            </Button>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className={cn("flex-1 flex flex-col", isGuest && "opacity-20 pointer-events-none select-none")}>
            {/* Messages */}
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Gemini AI</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about your document! I can help explain content, find information, or answer questions.
                    </p>
                  </div>

                  {suggestedQuestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Try asking:</p>
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestedQuestion(q)}
                          className="w-full text-left text-xs p-2 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about this PDF..."
                  className="flex-1 text-sm"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={chatLoading}
                />
                <Button size="sm" onClick={handleSendMessage} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className={cn("flex-1 flex flex-col p-3 gap-3", isGuest && "opacity-20 pointer-events-none select-none")}>
            <div className="flex gap-2">
              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value as AISummaryLength)}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="brief">Brief (~150 words)</option>
                <option value="detailed">Detailed (~400 words)</option>
              </select>
              <Button onClick={handleSummarize} disabled={isSummaryLoading || !documentText}>
                {isSummaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {summary ? (
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                  <Button variant="outline" size="sm" onClick={copySummary}>
                    {summaryCopied ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Generate a summary of your document
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rewrite Tab */}
        {activeTab === 'rewrite' && (
          <div className={cn("flex-1 flex flex-col p-3 gap-3 min-h-0", isGuest && "opacity-20 pointer-events-none select-none")}>
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

              <Button
                onClick={handleRewrite}
                disabled={isRewriteLoading || !selectedText}
                className="w-full"
              >
                {isRewriteLoading ? (
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyRewrite(suggestion, i)}
                      >
                        {copiedIndex === i ? (
                          <><Check className="h-3 w-3 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" /> Copy</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wand2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Select text and choose a tone to rewrite
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
