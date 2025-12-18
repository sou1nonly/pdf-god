import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Grid, List, Plus, ExternalLink, RefreshCw, Trash2, Edit2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export const DocumentsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<Document | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to load documents");
        return;
      }

      setDocuments(data || []);
      
      if (data && data.length > 0) {
        console.log(`Loaded ${data.length} documents`);
      }
    } catch (error) {
      console.error("Exception:", error);
      toast.error("An error occurred while loading documents");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      setDeleting(true);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([documentToDelete.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        toast.error('Failed to delete file from storage');
        return;
      }

      // Delete from database
      const { error: dbError } = await (supabase as any)
        .from('documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        toast.error('Failed to delete document record');
        return;
      }

      // Update local state
      setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id));
      toast.success('Document deleted successfully');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setDeleting(false);
    }
  };

  const handleRenameClick = (doc: Document) => {
    setDocumentToRename(doc);
    // Remove extension for editing, we'll add it back
    const nameWithoutExt = doc.file_name.replace(/\.[^/.]+$/, '');
    setNewFileName(nameWithoutExt);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!documentToRename || !newFileName.trim()) return;

    try {
      setRenaming(true);

      // Get the file extension from original filename
      const extension = documentToRename.file_name.split('.').pop();
      const fullNewName = `${newFileName.trim()}.${extension}`;

      // Check if name actually changed
      if (fullNewName === documentToRename.file_name) {
        setRenameDialogOpen(false);
        return;
      }

      // Update database
      const { error } = await (supabase as any)
        .from('documents')
        .update({ file_name: fullNewName })
        .eq('id', documentToRename.id);

      if (error) {
        console.error('Rename error:', error);
        toast.error('Failed to rename document');
        return;
      }

      // Update local state
      setDocuments(prev =>
        prev.map(d =>
          d.id === documentToRename.id
            ? { ...d, file_name: fullNewName }
            : d
        )
      );

      toast.success('Document renamed successfully');
      setRenameDialogOpen(false);
      setDocumentToRename(null);
      setNewFileName('');
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('An error occurred while renaming');
    } finally {
      setRenaming(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">My Documents</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchDocuments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate("/")}>
              <Plus className="h-4 w-4 mr-2" />
              Upload New
            </Button>
          </div>
        </div>

        {/* Search and View Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Upload your first PDF to get started"}
                </p>
              </div>
              <Button onClick={() => navigate("/")}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            }
          >
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="p-4 hover:shadow-md transition-all group"
              >
                {viewMode === 'grid' ? (
                  <div className="space-y-3">
                    <div className="aspect-[3/4] bg-muted rounded-md flex items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium truncate flex-1" title={doc.file_name}>
                          {doc.file_name}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/editor?id=${doc.id}`)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRenameClick(doc)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(doc)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/editor?id=${doc.id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" title={doc.file_name}>
                        {doc.file_name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/editor?id=${doc.id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameClick(doc)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(doc)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for "{documentToRename?.file_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Document name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renaming) {
                  handleRenameConfirm();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Extension will be preserved automatically
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={renaming || !newFileName.trim()}>
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
