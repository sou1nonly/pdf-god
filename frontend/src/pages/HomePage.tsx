import { 
  FileText, Sparkles, Zap, Menu, X, Home, Layout, 
  Folder, Search, Plus, Image, Type, MoreHorizontal, 
  Upload, Grid, Clock, Star, Settings, LogOut, User,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const HomePage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentDocs();
    }
  }, [user]);

  const fetchRecentDocs = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      setRecentDocs(data || []);
    } catch (error) {
      console.error('Error fetching recent docs:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadComplete = (files: File[], uploadedFiles?: any[]) => {
    toast.success(`${files.length} file(s) uploaded successfully!`);
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

  const SidebarItem = ({ icon: Icon, label, active = false, onClick }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const QuickActionCard = ({ icon: Icon, label, description, onClick, color }: any) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-xl bg-card border hover:shadow-md transition-all hover:-translate-y-1 group text-center h-full w-full"
    >
      <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-semibold text-foreground">{label}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2 border-b h-16">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">UniPDF</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem icon={Home} label="Home" active onClick={() => {}} />
          <SidebarItem icon={Folder} label="Projects" onClick={() => navigate('/documents')} />
          <SidebarItem icon={Layout} label="Templates" onClick={() => {}} />
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tools
          </div>
          <SidebarItem icon={Sparkles} label="AI Assistant" onClick={() => {}} />
          <SidebarItem icon={Image} label="Image Tools" onClick={() => {}} />
          <SidebarItem icon={Type} label="PDF Editor" onClick={() => navigate('/editor')} />
        </div>

        <div className="p-4 border-t">
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-primary">Pro Plan</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Unlock advanced AI features and unlimited storage.
            </p>
            <Button size="sm" className="w-full" variant="outline">Upgrade</Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0 gap-4">
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 max-w-xl relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search your content..." 
              className="pl-9 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Design
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Upload a Document</h2>
                  <FileUploadZone
                    onUploadComplete={handleUploadComplete}
                    maxFiles={1}
                    maxSizeMB={50}
                    acceptedFormats={['.pdf']}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                    <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
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
                <DropdownMenuItem onClick={() => navigate('/documents')}>
                  <Folder className="h-4 w-4 mr-2" />
                  My Projects
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-10">
            
            {/* Hero Section */}
            <section className="text-center space-y-6 py-8">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                What will you <span className="text-primary">design</span> today?
              </h1>
              
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-8">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="w-full h-full">
                      <QuickActionCard 
                        icon={Upload} 
                        label="Upload PDF" 
                        description="Edit & Sign" 
                        color="bg-blue-500"
                        onClick={() => {}}
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <div className="p-4">
                      <h2 className="text-lg font-semibold mb-4">Upload PDF to Edit</h2>
                      <FileUploadZone
                        onUploadComplete={handleUploadComplete}
                        maxFiles={1}
                        maxSizeMB={50}
                        acceptedFormats={['.pdf']}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <QuickActionCard 
                  icon={FileText} 
                  label="Doc" 
                  description="Create New" 
                  color="bg-indigo-500"
                  onClick={() => toast.info("Document creation coming soon!")}
                />
                <QuickActionCard 
                  icon={Layout} 
                  label="Whiteboard" 
                  description="Brainstorm" 
                  color="bg-purple-500"
                  onClick={() => toast.info("Whiteboard coming soon!")}
                />
                <QuickActionCard 
                  icon={Sparkles} 
                  label="AI Chat" 
                  description="Ask PDF" 
                  color="bg-pink-500"
                  onClick={() => toast.info("AI Chat coming soon!")}
                />
              </div>
            </section>

            {/* Recent Designs */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Recent Designs
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
                  View All
                </Button>
              </div>

              {loadingDocs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {recentDocs.length > 0 ? (
                    recentDocs.map((doc) => (
                      <div 
                        key={doc.id} 
                        onClick={() => navigate(`/editor?id=${doc.id}`)}
                        className="group relative aspect-[3/4] bg-muted/30 rounded-xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 group-hover:bg-muted/30 transition-colors">
                          <FileText className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs opacity-80">
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No recent documents found. Start by uploading one!
                    </div>
                  )}
                  
                  <button 
                    onClick={() => navigate('/documents')}
                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">New Project</span>
                  </button>
                </div>
              )}
            </section>

          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
          <div className="fixed inset-y-0 left-0 w-3/4 bg-card border-r p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-xl">UniPDF</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-2">
              <SidebarItem icon={Home} label="Home" active onClick={() => setMobileMenuOpen(false)} />
              <SidebarItem icon={Folder} label="Projects" onClick={() => {
                navigate('/documents');
                setMobileMenuOpen(false);
              }} />
              <SidebarItem icon={Type} label="Editor" onClick={() => {
                navigate('/editor');
                setMobileMenuOpen(false);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
