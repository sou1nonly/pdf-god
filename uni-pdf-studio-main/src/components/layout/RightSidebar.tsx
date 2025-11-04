import { ChevronRight, MessageSquare, Bot, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState } from "react";

interface RightSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const RightSidebar = ({ isOpen, onToggle }: RightSidebarProps) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      toast.success("Message sent to AI - Backend integration pending");
      setMessage("");
    }
  };

  if (!isOpen) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-2"
        >
          <Bot className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-80 border-l bg-card flex flex-col shrink-0">
      <div className="h-12 border-b flex items-center justify-between px-3">
        <h3 className="font-semibold text-sm">Assistant</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="ai" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="comments" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            AI
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-xs">
            <Settings2 className="h-3 w-3 mr-1" />
            Props
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="flex-1 overflow-auto p-3 m-0">
          <div className="text-sm text-muted-foreground text-center py-8">
            No comments yet
          </div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 flex flex-col m-0">
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Assistant</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hello! I can help you understand your document, summarize content, or answer questions. Just ask!
                </p>
              </div>
            </div>
          </ScrollArea>
          
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about this PDF..."
                className="flex-1"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <Button size="sm" onClick={handleSendMessage}>
                Send
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-auto p-3 m-0">
          <div className="text-sm text-muted-foreground text-center py-8">
            Select an element to view properties
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
};
