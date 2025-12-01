import { useState } from "react";
import { FileDown, Save, User, Settings, LogOut, Moon, Sun, ArrowLeft, Eye, Edit, Loader2 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  isSaving = false
}: TopBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">UP</span>
          </div>
          <span className="font-semibold text-lg">UniPDF</span>
        </div>

        <div className="h-6 w-px bg-border" />

        {isEditing ? (
          <Input
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditing(false);
            }}
            className="h-8 w-64"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium hover:text-primary transition-smooth px-2 py-1 rounded hover:bg-muted"
          >
            {fileName}
          </button>
        )}
      </div>

      {/* View Mode Toggle - Centered if possible, or just after filename */}
      {onViewModeChange && viewMode && (
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border mx-4">
          <Button 
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => onViewModeChange('preview')}
            className="h-7 text-xs gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button 
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => onViewModeChange('edit')}
            className="h-7 text-xs gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      )}

      {processingStatus === 'processing' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mx-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
          Processing... {Math.round(processingProgress || 0)}%
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {showActions && (
          <>
            <Button 
              variant={hasUnsavedChanges ? "default" : "ghost"} 
              size="sm" 
              onClick={onSave}
              disabled={isSaving}
              className={hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save*' : 'Save'}
              </span>
            </Button>
            
            <Button variant="default" size="sm" onClick={onDownload}>
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <div className="h-6 w-px bg-border mx-2" />
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
