import { useState, useRef, useEffect } from 'react';
import { clientAI } from '@/lib/ai/client-ai-service';
import { cn } from '@/lib/utils';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
}

export const AIAssistantPanel = ({
  isOpen,
  onClose,
  documentText
}: AIAssistantPanelProps) => {
  // Active tab
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'rewrite'>('summary');
  
  // Summary state
  const [summary, setSummary] = useState('');
  const [summaryLength, setSummaryLength] = useState<'brief' | 'detailed'>('brief');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Rewrite state
  const [selectedText, setSelectedText] = useState('');
  const [rewriteTone, setRewriteTone] = useState<'formal' | 'casual' | 'concise' | 'detailed'>('formal');
  const [rewriteSuggestions, setRewriteSuggestions] = useState<string[]>([]);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // ================== Summary Functions ==================
  const handleSummarize = async () => {
    if (!documentText.trim()) {
      setSummary('No document text available to summarize.');
      return;
    }

    setSummaryLoading(true);
    setSummary('');
    
    try {
      const result = await clientAI.summarize(documentText, summaryLength);
      setSummary(result.summary);
    } catch (error) {
      console.error('Summarization error:', error);
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2000);
  };

  // ================== Chat Functions ==================
  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const result = await clientAI.chat(userMessage, documentText, messages);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.answer,
        confidence: result.confidence
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ================== Rewrite Functions ==================
  const handleRewrite = async () => {
    if (!selectedText.trim()) {
      setRewriteSuggestions(['Please select some text in the document first.']);
      return;
    }

    setRewriteLoading(true);
    setRewriteSuggestions([]);

    try {
      const result = await clientAI.rewrite(selectedText, rewriteTone);
      setRewriteSuggestions(result.suggestions);
    } catch (error) {
      console.error('Rewrite error:', error);
      setRewriteSuggestions(['Failed to generate rewrites. Please try again.']);
    } finally {
      setRewriteLoading(false);
    }
  };

  const copyRewrite = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['summary', 'chat', 'rewrite'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 px-3 text-xs font-medium transition-colors",
              activeTab === tab 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === 'summary' && '📄 Summary'}
            {tab === 'chat' && '💬 Chat'}
            {tab === 'rewrite' && '✨ Rewrite'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="flex-1 flex flex-col p-4 gap-4">
            <div className="flex gap-2">
              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value as 'brief' | 'detailed')}
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="brief">Brief (~100 words)</option>
                <option value="detailed">Detailed (~250 words)</option>
              </select>
              <button 
                onClick={handleSummarize} 
                disabled={summaryLoading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {summaryLoading ? 'Loading...' : 'Generate'}
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {summary ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                  <button 
                    onClick={copySummary}
                    className="px-3 py-1 text-xs border border-border rounded hover:bg-muted"
                  >
                    {summaryCopied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click "Generate" to create a summary of your document.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-4 gap-4">
            <div className="flex-1 overflow-auto pr-2">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ask questions about your document.
                  </p>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.confidence !== undefined && msg.confidence > 0 && (
                          <p className="text-xs opacity-60 mt-1">
                            Confidence: {Math.round(msg.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                disabled={chatLoading}
              />
              <button 
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {/* Rewrite Tab */}
        {activeTab === 'rewrite' && (
          <div className="flex-1 flex flex-col p-4 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Selected: {selectedText ? `"${selectedText.slice(0, 50)}${selectedText.length > 50 ? '...' : ''}"` : 'None'}
              </p>
              
              <div className="flex gap-1 flex-wrap">
                {(['formal', 'casual', 'concise', 'detailed'] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setRewriteTone(tone)}
                    className={cn(
                      "px-2 py-1 text-xs rounded",
                      rewriteTone === tone 
                        ? 'bg-primary text-primary-foreground' 
                        : 'border border-border hover:bg-muted'
                    )}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleRewrite} 
                disabled={rewriteLoading || !selectedText}
                className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {rewriteLoading ? 'Generating...' : '✨ Generate Rewrites'}
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {rewriteSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {rewriteSuggestions.map((suggestion, i) => (
                    <div 
                      key={i}
                      className="p-3 bg-muted rounded-lg space-y-2"
                    >
                      <p className="text-sm">{suggestion}</p>
                      <button
                        onClick={() => copyRewrite(suggestion, i)}
                        className="px-2 py-1 text-xs border border-border rounded hover:bg-background"
                      >
                        {copiedIndex === i ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select text in the document, choose a tone, and click "Generate Rewrites".
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
        ✨ AI runs locally in your browser
      </div>
    </div>
  );
};
