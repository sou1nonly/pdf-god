import {
  FileText, Sparkles, Menu, X, Home, Layout,
  Folder, Search, Plus, Image, Type,
  Upload, User, LogOut, Settings, Bell, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { FileUploadZone } from "@/components/upload/FileUploadZone";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DocumentsList } from "@/components/document/DocumentsList";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, signOut, isGuest } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleUploadComplete = (files: File[], uploadedFiles?: any[]) => {
    console.log("Upload complete. Files:", files.length, "IsGuest:", isGuest);
    toast.success(`${files.length} file(s) uploaded successfully!`);

    if (isGuest && files.length > 0) {
      // Guest mode: Navigate with file object URL in state
      const file = files[0];
      const url = URL.createObjectURL(file);
      navigate('/editor', {
        state: {
          fileUrl: url,
          fileName: file.name,
          isLocal: true
        }
      });
      return;
    }

    if (uploadedFiles && uploadedFiles.length > 0 && uploadedFiles[0].documentId) {
      navigate(`/editor?id=${uploadedFiles[0].documentId}`);
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar-background">
      <div className="p-6 flex items-center gap-3">
        <div className="logo-icon">
          <FileText className="h-5 w-5" />
        </div>
        <span className="logo-text">UniPDF</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors">
          <Home className="h-4 w-4" />
          Home
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted/50" onClick={() => document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <Folder className="h-4 w-4" />
          My Projects
        </Button>


        <div className="pt-6 pb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tools
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted/50" onClick={() => toast.info("Open a document to use AI Assistant")}>
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>

        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-muted/50" onClick={() => navigate('/editor')}>
          <Type className="h-4 w-4" />
          PDF Editor
        </Button>
      </div>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-primary">Pro Plan</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Unlock advanced AI features and unlimited storage.
          </p>
          <Button size="sm" className="w-full bg-primary hover:bg-primary-hover text-white shadow-soft font-medium">Upgrade</Button>
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, label, description, onClick, colorClass }: any) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-start justify-between p-6 rounded-3xl ${colorClass.bg} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group text-left h-36 w-full relative overflow-hidden border-none`}
    >
      <Icon className={`h-8 w-8 ${colorClass.icon} mb-auto`} />

      <div className="z-10 mt-4">
        <h3 className="font-bold text-foreground text-lg tracking-tight">{label}</h3>
        <p className="text-sm text-foreground/60 font-medium">{description}</p>
      </div>

      {/* Decorative large icon in background */}
      <Icon className={`absolute -right-4 -bottom-4 h-24 w-24 opacity-10 ${colorClass.icon} rotate-12`} />
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shrink-0 z-20 shadow-soft">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 py-4 shrink-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="md:hidden flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="logo-icon h-8 w-8">
              <FileText className="h-4 w-4" />
            </div>
          </div>



          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-5 w-5" />
            </Button>


            {/* Create Design button - opens global upload dialog */}
            <Button
              className="hidden sm:flex bg-primary hover:bg-primary-hover text-white shadow-glow rounded-xl h-11 px-6 font-semibold"
              onClick={() => setIsUploadOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Design
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border-2 border-white shadow-sm ring-2 ring-transparent hover:ring-primary/20 transition-all">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Folder className="h-4 w-4 mr-2" />
                  My Projects
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 pb-20">

            {/* Hero Section */}
            <section className="text-center space-y-4 py-8 md:py-12 fade-in">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                What will you <span className="text-primary relative inline-block">
                  design
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                  </svg>
                </span> today?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Create, edit, and collaborate on your PDF documents with the power of AI.
              </p>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-12">
                {/* Upload PDF Card - just opens dialog */}
                {/* Upload PDF Card - just opens dialog */}
                <QuickActionCard
                  icon={Upload}
                  label="Upload PDF"
                  description="Edit & Sign"
                  colorClass={{ bg: 'bg-pastel-blue', icon: 'text-blue-900' }}
                  onClick={() => setIsUploadOpen(true)}
                />

                <QuickActionCard
                  icon={FileText}
                  label="New Doc"
                  description="Start Blank"
                  colorClass={{ bg: 'bg-pastel-green', icon: 'text-green-900' }}
                  onClick={() => toast.success("Starting new document...")}
                />

                <QuickActionCard
                  icon={Layout}
                  label="Whiteboard"
                  description="Brainstorm"
                  colorClass={{ bg: 'bg-pastel-yellow', icon: 'text-yellow-900' }}
                  onClick={() => toast.info("Whiteboard feature coming soon!")}
                />

                <QuickActionCard
                  icon={Sparkles}
                  label="AI Chat"
                  description="Ask PDF"
                  colorClass={{ bg: 'bg-pastel-pink', icon: 'text-pink-900' }}
                  onClick={() => toast.info("Select a document to start AI Chat")}
                />
              </div>
            </section>

            {/* Integrated Documents Section */}
            <section id="documents-section" className="space-y-6 pt-8 border-t border-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
                {/* DocumentsList handles its own toggle controls */}
              </div>

              <div className="bg-card/50 rounded-3xl p-1 md:p-6 min-h-[400px]">
                <DocumentsList embedded onUploadClick={() => setIsUploadOpen(true)} />
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Global Upload Dialog - can be triggered from anywhere */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Upload PDF to Edit</h2>
            <FileUploadZone
              onUploadComplete={(files, uploaded) => {
                setIsUploadOpen(false);
                handleUploadComplete(files, uploaded);
              }}
              maxFiles={1}
              maxSizeMB={50}
              acceptedFormats={['.pdf']}
              localOnly={isGuest}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
