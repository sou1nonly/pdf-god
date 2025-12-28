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
      <div className="p-6">
        {/* Logo - Full logo, no text */}
        <img src="/logo-full.png" alt="Lamina" className="h-[50px] w-auto object-contain" />
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
      className="relative overflow-hidden group p-6 rounded-2xl h-40 w-full text-left transition-all duration-300 hover:-translate-y-1 bg-white border border-border hover:border-primary/40 shadow-sm hover:shadow-md"
    >
      <div className={`h-12 w-12 rounded-xl ${colorClass.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
        <Icon className={`h-6 w-6 ${colorClass.icon}`} />
      </div>

      <div className="z-10 relative">
        <h3 className="font-bold text-foreground text-lg tracking-tight mb-1">{label}</h3>
        <p className="text-sm text-muted-foreground font-medium">{description}</p>
      </div>

      {/* Subtle decorative watermark */}
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.05] rotate-12 transition-transform group-hover:rotate-6" />
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
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
            {/* Mobile Logo Icon */}
            <img src="/logo-icon.png" alt="Lamina Logo" className="h-8 w-8 rounded-lg object-contain" />
          </div>



          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground border border-border rounded-lg">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground border border-border rounded-lg">
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
                <DropdownMenuItem onClick={() => toast.info("Coming Soon", { description: "Settings will be available in a future update." })}>
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
            <section className="text-center space-y-12 py-8 md:py-12 fade-in max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider animate-fade-in-up">
                <Sparkles className="h-3.5 w-3.5" />
                <span>The new standard for docs</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
                <span className="block">What will you <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-pink-500">design</span></span>
                <span className="block mt-2 md:mt-4">today?</span>
              </h1>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14">
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
            <section id="documents-section" className="space-y-6 pt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
                {/* DocumentsList handles its own toggle controls */}
              </div>

              <div className="bg-card/50 rounded-3xl p-1 md:p-6 min-h-[400px] border border-border/50">
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
