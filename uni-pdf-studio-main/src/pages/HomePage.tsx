import { FileText, Sparkles, Zap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { FileUploadZone } from "@/components/upload/FileUploadZone";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";

const HomePage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleUploadComplete = (files: File[], uploadedFiles?: any[]) => {
    toast.success(`${files.length} file(s) uploaded successfully!`);
    // Navigate to editor with the first document's ID immediately
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">UP</span>
            </div>
            <span className="font-semibold text-lg md:text-xl">UniPDF Studio</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate('/editor')}>
                  My Documents
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
                        <p className="text-sm font-medium leading-none">
                          {user?.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/editor')}>
                      <FileText className="h-4 w-4 mr-2" />
                      My Documents
                    </DropdownMenuItem>
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
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/login')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card/95 backdrop-blur-sm animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 border-b">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="justify-start" 
                    onClick={() => {
                      navigate('/editor');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    My Documents
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start text-destructive"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="justify-start" 
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="justify-start" 
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="container mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {user ? (
              <>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Welcome back,
                  <span className="gradient-primary bg-clip-text text-transparent">
                    {' '}{user.user_metadata?.full_name?.split(' ')[0] || 'User'}!
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Upload a new document or{' '}
                  <button 
                    onClick={() => navigate('/editor')}
                    className="text-primary hover:underline font-medium"
                  >
                    view your existing documents
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  AI-Powered PDF Editing
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Your Complete PDF
                  <span className="gradient-primary bg-clip-text text-transparent"> Workspace</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Edit, annotate, and transform your PDFs with powerful AI assistance. 
                  Professional document management made simple.
                </p>
              </>
            )}

            {/* Upload Zone */}
            <div className="max-w-2xl mx-auto">
              <FileUploadZone
                onUploadComplete={handleUploadComplete}
                maxFiles={5}
                maxSizeMB={100}
                acceptedFormats={['.pdf']}
              />
              
              {user && (
                <div className="mt-6">
                  <Button 
                    size="lg"
                    variant="outline" 
                    onClick={() => navigate('/editor')}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View All Documents
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-card/30 backdrop-blur-sm py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Complete Editing Suite</h3>
                <p className="text-muted-foreground text-sm">
                  Add text, images, shapes, and annotations with intuitive tools
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg">AI-Powered Intelligence</h3>
                <p className="text-muted-foreground text-sm">
                  Summarize, chat with your PDF, and enhance content with AI
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold text-lg">Lightning Fast</h3>
                <p className="text-muted-foreground text-sm">
                  Work seamlessly with instant processing and real-time updates
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 UniPDF Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
