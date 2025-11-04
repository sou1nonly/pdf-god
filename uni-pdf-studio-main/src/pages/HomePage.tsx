import { FileText, Sparkles, Zap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { FileUploadZone } from "@/components/upload/FileUploadZone";

const HomePage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleUploadComplete = (files: File[]) => {
    toast.success(`${files.length} file(s) uploaded successfully!`);
    // Navigate to editor with the first file
    if (files.length > 0) {
      setTimeout(() => {
        navigate("/editor");
      }, 1000);
    }
  };

  const handleNavigation = (path: string) => {
    toast.info(`Navigation to ${path} - Coming soon!`);
    setMobileMenuOpen(false);
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
            <Button variant="ghost" onClick={() => handleNavigation('/features')}>Features</Button>
            <Button variant="ghost" onClick={() => handleNavigation('/pricing')}>Pricing</Button>
            <Button variant="outline" onClick={() => handleNavigation('/signin')}>Sign In</Button>
            <Button onClick={() => navigate('/editor')}>Get Started</Button>
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
              <Button variant="ghost" className="justify-start" onClick={() => handleNavigation('/features')}>
                Features
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => handleNavigation('/pricing')}>
                Pricing
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => handleNavigation('/signin')}>
                Sign In
              </Button>
              <Button className="justify-start" onClick={() => navigate('/editor')}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="container mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center">
          <div className="max-w-4xl mx-auto text-center space-y-8">
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

            {/* Upload Zone */}
            <div className="max-w-2xl mx-auto">
              <FileUploadZone
                onUploadComplete={handleUploadComplete}
                maxFiles={5}
                maxSizeMB={100}
                acceptedFormats={['.pdf']}
              />
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
