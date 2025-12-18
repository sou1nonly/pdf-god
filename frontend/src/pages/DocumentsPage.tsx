import { DocumentsList } from "@/components/document/DocumentsList";
import { TopBar } from "@/components/layout/TopBar";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Sparkles, Zap, Menu, X, Home, Layout, 
  Folder, Search, Plus, Image, Type, MoreHorizontal, 
  Upload, Grid, Clock, Star, Settings, LogOut, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Desktop (Same as HomePage) */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2 border-b h-16">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">UniPDF</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <SidebarItem icon={Home} label="Home" onClick={() => navigate('/')} />
          <SidebarItem icon={Folder} label="Projects" active onClick={() => {}} />
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar 
          fileName="My Documents" 
          onFileNameChange={() => {}}
          onSave={() => {}}
          onDownload={() => {}}
          showActions={false}
          onBack={() => navigate('/')}
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <DocumentsList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
