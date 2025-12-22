import { useState } from "react";
import { FileDown, Save, User, Settings, LogOut, Moon, Sun, ArrowLeft, Eye, Edit, Loader2, Undo2, Redo2, Menu, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TopBarProps {
  fileName: string;
  onFileNameChange: (name: string) => void;
  onSave?: () => void;
  onDownload?: () => void;
  onBack?: () => void;
  showActions?: boolean;
  viewMode?: 'preview' | 'edit';
  onViewModeChange?: (mode: 'preview' | 'edit') => void;
  processingStatus?: 'idle' | 'processing' | 'complete' | 'error';
  processingProgress?: number;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onMobileLeftToggle?: () => void;
  onMobileRightToggle?: () => void;
}

export const TopBar = ({
  fileName,
  onFileNameChange,
  onSave,
  onDownload,
  onBack,
  showActions = true,
  viewMode,
  onViewModeChange,
  processingStatus,
  processingProgress,
  hasUnsavedChanges = false,
  isSaving = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onMobileLeftToggle,
  onMobileRightToggle
}: TopBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, signOut, isGuest } = useAuth();
  const navigate = useNavigate();
  const [downloadCount, setDownloadCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('guest_download_count') || '0');
  });

  const handleGuestAction = (action: 'save' | 'download', callback?: () => void) => {
    if (!isGuest) {
      callback?.();
      return;
    }

    if (action === 'save') {
      toast.error("Sign in required", {
        description: "You must be signed in to save your progress to the cloud."
      });
      return;
    }

    if (action === 'download') {
      if (downloadCount >= 5) {
        toast.error("Download limit reached", {
          description: "You have reached the limit of 5 downloads as a guest. Please sign in to continue."
        });
        return;
      }

      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      localStorage.setItem('guest_download_count', newCount.toString());
      toast.info(`Guest download ${newCount}/5`, {
        description: "Sign in for unlimited downloads."
      });
      callback?.();
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-30">
      <div className="flex items-center gap-4">


        {onBack && (
          <Button variant="outline" size="icon" onClick={onBack} className="mr-1 h-9 w-9 bg-white border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-3">
          <div className="logo-icon h-9 w-9">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          <span className="logo-text text-xl hidden md:inline-block">UniPDF</span>
        </div>

        <div className="h-8 w-px bg-border mx-2 hidden md:block" />

        {isEditing ? (
          <Input
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditing(false);
            }}
            className="h-9 w-48 md:w-64 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-base font-medium hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 truncate max-w-[150px] md:max-w-xs text-left"
            title="Click to rename"
          >
            {fileName}
          </button>
        )}
      </div>



      <div className="flex items-center gap-2 md:gap-3 ml-auto">


        {processingStatus === 'processing' && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full mr-2 hidden md:flex">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent"></div>
            <span>Processing... {Math.round(processingProgress || 0)}%</span>
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="sm"
              onClick={() => handleGuestAction('save', onSave)}
              disabled={isSaving}
              className={`h-9 md:h-10 px-3 md:px-4 rounded-xl transition-all shadow-sm hover:shadow-md ${hasUnsavedChanges
                ? "bg-pastel-green hover:bg-emerald-200 text-green-900 border-green-200"
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline font-medium">
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => handleGuestAction('download', onDownload)}
              className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-primary hover:bg-primary-hover shadow-glow"
            >
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline font-medium">Export</span>
            </Button>
          </div>
        )}

        <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border-2 border-white shadow-sm ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <Avatar className="h-full w-full">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-soft">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
