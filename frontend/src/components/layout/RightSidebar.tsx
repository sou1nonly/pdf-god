import { ChevronRight, Bot, FileText, Wand2, Loader2, Send, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAIChat, useAISummarize, useAIRewrite, useAIQuestions } from "@/hooks/api";
import type { ChatMessage, AISummaryLength, AIRewriteTone } from "@unipdf/shared";

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  documentText?: string;
}

export const RightSidebar = ({
  isOpen,
  onToggle,
  documentText = '',
}: RightSidebarProps) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'rewrite'>('chat');

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

  // Generate suggested questions when document loads
  useEffect(() => {
    if (documentText && documentText.length > 100 && !questionsGenerated && suggestedQuestions.length === 0) {
      generateQuestions(
        { documentText, count: 3 },
        {
          onSuccess: (data) => {
            setSuggestedQuestions(data.slice(0, 3));
            setQuestionsGenerated(true);
          }
        }
      );
    }
  }, [documentText, generateQuestions, questionsGenerated, suggestedQuestions.length]);

  // ========== Chat ==========
  const handleSendMessage = () => {
    if (!chatInput.trim() || chatLoading) return;

    if (!documentText) {
      toast.error('No document loaded');
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput("");

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    chat(
      { message: userMessage, documentText, history: messages },
      {
        onSuccess: (response: string) => {
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
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
        onSuccess: (result) => {
          setSummary(result);
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
        onSuccess: (result: string[]) => {
          setRewriteSuggestions(result);
        }
      }
    );
  };

  const copyRewrite = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-2">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-2">
          <Bot className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const isSummaryLoading = summaryLoadingHook || internalSummaryLoading;
  const isRewriteLoading = rewriteLoadingHook;

  return (
    <aside className="w-80 border-l bg-card flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="h-12 border-b flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {([
          { id: 'chat', label: 'Chat', icon: Bot },
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-2 px-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors",
              activeTab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
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
          <div className="flex-1 flex flex-col p-3 gap-3">
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
          <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
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

      {/* Footer */}
      <div className="p-2 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Powered by Gemini 2.0 Flash
        </p>
      </div>
    </aside>
  );
};
