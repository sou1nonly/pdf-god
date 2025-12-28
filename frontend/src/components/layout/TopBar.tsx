import { useState } from "react";
import { FileDown, Save, User, Settings, LogOut, Loader2 } from "lucide-react";
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
import { SettingsModal } from "@/components/editor/SettingsModal";

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
  leftSidebarOpen?: boolean;
  rightSidebarOpen?: boolean;
}

export const TopBar = ({
  fileName,
  onFileNameChange,
  onSave,
  onDownload,
  showActions = true,
  processingStatus,
  processingProgress,
  hasUnsavedChanges = false,
  isSaving = false,
  leftSidebarOpen = true,
  rightSidebarOpen = true,
}: TopBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");

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

  const openSettings = (tab: string) => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  // Right section width matches sidebar state, Left section is FIXED
  const rightWidth = rightSidebarOpen ? 'w-80' : 'w-14';

  return (
    <>
      <header className="h-16 border-b flex items-stretch shrink-0 z-30 sticky top-0 bg-background">
        {/* LEFT SECTION - Fixed width for logo area (independent of sidebar) */}
        <div className="w-40 shrink-0 flex items-center bg-card/50">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2.5 w-full h-full px-4 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
            title="Back to Dashboard"
          >
            <img
              src="/logo-icon.png"
              alt="Lamina Logo"
              className="h-8 w-8 rounded-lg object-contain group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="logo-text text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              Lamina
            </span>
          </button>
        </div>

        {/* CENTER SECTION - Flexible width, contains file name */}
        <div className="flex-1 flex items-center px-6 min-w-0">
          {isEditing ? (
            <Input
              value={fileName}
              onChange={(e) => onFileNameChange(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditing(false);
              }}
              className="h-9 w-full max-w-md bg-muted/30 border-border focus:bg-background focus:border-primary transition-all text-sm font-medium"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 truncate max-w-md text-left"
              title="Click to rename"
            >
              {fileName}
            </button>
          )}

          {processingStatus === 'processing' && (
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full ml-4 hidden md:flex">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent"></div>
              <span>Processing... {Math.round(processingProgress || 0)}%</span>
            </div>
          )}
        </div>

        {/* RIGHT SECTION - Matches Right Sidebar Width (NO border - sidebar has its own) */}
        <div className={`${rightWidth} shrink-0 flex items-center justify-end gap-2 px-4 bg-card/50 transition-all duration-300`}>
          {showActions && (
            <>
              <Button
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                onClick={() => handleGuestAction('save', onSave)}
                disabled={isSaving}
                className={`h-9 px-3 rounded-lg transition-all shadow-sm ${hasUnsavedChanges
                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200"
                  : "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2 hidden lg:inline font-medium text-xs">
                  {isSaving ? 'Saving' : hasUnsavedChanges ? 'Save' : 'Saved'}
                </span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => handleGuestAction('download', onDownload)}
                className="h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                <span className="ml-2 hidden lg:inline font-medium text-xs">Export</span>
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 border border-border shadow-sm hover:ring-2 hover:ring-primary/20 transition-all shrink-0"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-lg p-1">
              <DropdownMenuLabel className="px-2 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Coming Soon", { description: "Profile settings will be available in a future update." })} className="cursor-pointer rounded-lg">
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Coming Soon", { description: "App settings will be available in a future update." })} className="cursor-pointer rounded-lg">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SettingsModal
        isOpen={showSettings}
        onOpenChange={setShowSettings}
        defaultTab={settingsTab}
      />
    </>
  );
};
