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
import { DocumentThumbnail } from "./DocumentThumbnail";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

interface DocumentsListProps {
  embedded?: boolean;
  onUploadClick?: () => void;
}

export const DocumentsList = ({ embedded = false, onUploadClick }: DocumentsListProps) => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
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
    if (user && !isGuest) {
      fetchDocuments();
    } else if (isGuest) {
      setLoading(false);
    }
  }, [user, isGuest]);

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
        // If guest, likely RLS restriction or no documents yet. Don't show error.
        if (!isGuest) {
          toast.error(`Failed to load documents: ${error.message || 'Unknown error'}`);
        }
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
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${embedded ? 'h-auto' : 'h-full'}`}>
      {/* Header - Only hide Title/Nav if embedded, but keep search/filters? 
          Actually user wants "Search bar for filtering documents and a toggle for grid/list views" IN the integrated section.
          So we keep the controls but hide the big "My Documents" title.
      */}
      <div className={`${embedded ? 'mb-6' : 'border-b bg-card p-4'}`}>
        {/* Header Title (Hidden if embedded) */}
        {!embedded && (
          <h1 className="text-2xl font-bold mb-4">My Documents</h1>
        )}

        {/* Controls - Always visible, but styled differently if embedded */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* If embedded, we might hide the refresh button or move it */}
          {!embedded && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchDocuments}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>

        {/* Search and View Controls - Styled for Pastel Aesthetic */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border border-border shadow-sm h-10 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-border">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-primary/20 text-primary' : ''}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-primary/20 text-primary' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {embedded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDocuments}
              className="text-muted-foreground hover:text-primary border border-border rounded-lg"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Documents Grid/List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">{isGuest ? "Guest Mode" : "No documents found"}</p>
                <p className="text-sm text-muted-foreground">
                  {isGuest
                    ? "Files edited in Guest Mode are not saved to the cloud."
                    : searchQuery
                      ? "Try a different search term"
                      : "Upload your first PDF to get started"}
                </p>
              </div>
              <Button onClick={() => onUploadClick ? onUploadClick() : navigate("/")}>
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
                className="p-4 transition-all group border-2 border-border/70 hover:border-primary/40 bg-white rounded-2xl shadow-sm hover:shadow-lg"
              >
                {viewMode === 'grid' ? (
                  <div className="space-y-3">
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden border border-border/50">
                      <DocumentThumbnail storagePath={doc.storage_path} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate flex-1 text-sm group-hover:text-primary transition-colors" title={doc.file_name}>
                          {doc.file_name}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-3 w-3" />
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
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-primary/10 text-primary border-0 hover:bg-primary hover:text-white transition-all font-semibold"
                        onClick={() => navigate(`/editor?id=${doc.id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-pastel-blue/20 rounded-lg flex items-center justify-center shrink-0 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors" title={doc.file_name}>
                        {doc.file_name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/editor?id=${doc.id}`)}
                        className="text-primary hover:bg-primary/10"
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
