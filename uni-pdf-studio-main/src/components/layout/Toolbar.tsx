import { 
  MousePointer2, 
  Type, 
  Pen, 
  Square, 
  Circle, 
  Image as ImageIcon,
  CheckSquare,
  Highlighter,
  Underline,
  MessageSquare,
  FilePlus,
  Trash2,
  RotateCw,
  ArrowUpDown,
  Sparkles,
  Bot,
  FileEdit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ToolbarProps {
  activeTool?: string;
  onToolChange?: (tool: string) => void;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

const ToolButton = ({ icon, label, onClick, active }: ToolButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="icon"
          onClick={onClick}
          className="h-9 w-9"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const Toolbar = ({ activeTool = 'select', onToolChange }: ToolbarProps) => {
  const handleToolClick = (tool: string, label: string) => {
    onToolChange?.(tool);
    toast.success(`${label} tool activated`);
  };

  return (
    <div className="h-14 border-b bg-card flex items-center px-2 md:px-4 gap-1 md:gap-2 shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1">
        <span className="hidden lg:inline text-xs font-medium text-muted-foreground mr-2">Edit</span>
        <ToolButton 
          icon={<MousePointer2 className="h-4 w-4" />} 
          label="Select" 
          active={activeTool === 'select'}
          onClick={() => handleToolClick('select', 'Select')}
        />
        <ToolButton 
          icon={<Type className="h-4 w-4" />} 
          label="Text"
          active={activeTool === 'text'}
          onClick={() => handleToolClick('text', 'Text')}
        />
        <ToolButton 
          icon={<Pen className="h-4 w-4" />} 
          label="Draw"
          active={activeTool === 'draw'}
          onClick={() => handleToolClick('draw', 'Draw')}
        />
        <ToolButton 
          icon={<Square className="h-4 w-4" />} 
          label="Rectangle"
          active={activeTool === 'rectangle'}
          onClick={() => handleToolClick('rectangle', 'Rectangle')}
        />
        <ToolButton 
          icon={<Circle className="h-4 w-4" />} 
          label="Circle"
          active={activeTool === 'circle'}
          onClick={() => handleToolClick('circle', 'Circle')}
        />
        <ToolButton 
          icon={<ImageIcon className="h-4 w-4" />} 
          label="Image"
          active={activeTool === 'image'}
          onClick={() => handleToolClick('image', 'Image')}
        />
        <ToolButton 
          icon={<CheckSquare className="h-4 w-4" />} 
          label="Forms"
          active={activeTool === 'forms'}
          onClick={() => handleToolClick('forms', 'Forms')}
        />
      </div>

      <Separator orientation="vertical" className="h-8" />

      <div className="flex items-center gap-1">
        <span className="hidden lg:inline text-xs font-medium text-muted-foreground mr-2">Annotate</span>
        <ToolButton 
          icon={<Highlighter className="h-4 w-4" />} 
          label="Highlight"
          active={activeTool === 'highlight'}
          onClick={() => handleToolClick('highlight', 'Highlight')}
        />
        <ToolButton 
          icon={<Underline className="h-4 w-4" />} 
          label="Underline"
          active={activeTool === 'underline'}
          onClick={() => handleToolClick('underline', 'Underline')}
        />
        <ToolButton 
          icon={<MessageSquare className="h-4 w-4" />} 
          label="Comment"
          active={activeTool === 'comment'}
          onClick={() => handleToolClick('comment', 'Comment')}
        />
      </div>

      <Separator orientation="vertical" className="h-8 hidden md:block" />

      <div className="hidden md:flex items-center gap-1">
        <span className="hidden lg:inline text-xs font-medium text-muted-foreground mr-2">Pages</span>
        <ToolButton 
          icon={<FilePlus className="h-4 w-4" />} 
          label="Add Page"
          onClick={() => toast.success('Add page - Coming soon!')}
        />
        <ToolButton 
          icon={<Trash2 className="h-4 w-4" />} 
          label="Delete Page"
          onClick={() => toast.success('Delete page - Coming soon!')}
        />
        <ToolButton 
          icon={<RotateCw className="h-4 w-4" />} 
          label="Rotate"
          onClick={() => toast.success('Rotate page - Coming soon!')}
        />
        <ToolButton 
          icon={<ArrowUpDown className="h-4 w-4" />} 
          label="Reorder"
          onClick={() => toast.success('Reorder pages - Coming soon!')}
        />
      </div>

      <Separator orientation="vertical" className="h-8 hidden lg:block" />

      <div className="hidden lg:flex items-center gap-1">
        <span className="hidden lg:inline text-xs font-medium text-muted-foreground mr-2">AI</span>
        <ToolButton 
          icon={<Sparkles className="h-4 w-4" />} 
          label="Summarize"
          onClick={() => toast.success('AI Summarize - Coming soon!')}
        />
        <ToolButton 
          icon={<Bot className="h-4 w-4" />} 
          label="Chat"
          onClick={() => toast.success('AI Chat - Coming soon!')}
        />
        <ToolButton 
          icon={<FileEdit className="h-4 w-4" />} 
          label="Rewrite"
          onClick={() => toast.success('AI Rewrite - Coming soon!')}
        />
      </div>
    </div>
  );
};
