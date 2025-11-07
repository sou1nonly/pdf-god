import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadFileToStorage, saveFileMetadata } from "@/lib/storage";
import { 
  detectFileType, 
  convertAndCreatePDF, 
  needsConversion,
  getSupportedExtensions 
} from "@/lib/format-converter";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'converting' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
  documentId?: string;
  needsConversion?: boolean;
}

interface FileUploadZoneProps {
  onUploadComplete?: (files: File[], uploadedFiles?: UploadFile[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
}

export const FileUploadZone = ({
  onUploadComplete,
  maxFiles = 5,
  maxSizeMB = 100,
  acceptedFormats = ['.pdf']
}: FileUploadZoneProps) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type using format converter
    const fileInfo = detectFileType(file);
    
    if (!fileInfo.isSupported) {
      return {
        valid: false,
        error: `File type .${fileInfo.type} is not supported`
      };
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`
      };
    }

    // Check if file already exists
    const isDuplicate = uploadFiles.some(
      uf => uf.file.name === file.name && uf.file.size === file.size
    );
    if (isDuplicate) {
      return {
        valid: false,
        error: 'File already added'
      };
    }

    return { valid: true };
  };

  const simulateUpload = async (uploadFile: UploadFile) => {
    try {
      let fileToUpload = uploadFile.file;
      console.log('Starting upload for:', uploadFile.file.name, 'Needs conversion:', needsConversion(uploadFile.file));

      // Check if file needs conversion
      if (needsConversion(uploadFile.file)) {
        // Update status to converting
        setUploadFiles(prev =>
          prev.map(uf =>
            uf.id === uploadFile.id
              ? { ...uf, status: 'converting' as const, progress: 0 }
              : uf
          )
        );

        // Convert file to PDF
        const convertedFile = await convertAndCreatePDF(uploadFile.file, {
          onProgress: (progress) => {
            setUploadFiles(prev =>
              prev.map(uf =>
                uf.id === uploadFile.id
                  ? { ...uf, progress: Math.floor(progress / 2) } // 0-50% for conversion
                  : uf
              )
            );
          },
        });

        if (!convertedFile) {
          throw new Error('File conversion failed');
        }

        console.log('File converted successfully:', convertedFile.name);
        fileToUpload = convertedFile;
      }

      // Update status to uploading
      console.log('Uploading file:', fileToUpload.name, 'Size:', fileToUpload.size, 'Type:', fileToUpload.type);
      setUploadFiles(prev =>
        prev.map(uf =>
          uf.id === uploadFile.id
            ? { ...uf, status: 'uploading' as const }
            : uf
        )
      );

      // Upload to Supabase Storage
      const result = await uploadFileToStorage(fileToUpload, {
        folder: 'uploads',
        onProgress: (progress) => {
          setUploadFiles(prev =>
            prev.map(uf =>
              uf.id === uploadFile.id
                ? { 
                    ...uf, 
                    progress: uploadFile.needsConversion 
                      ? 50 + Math.floor(progress / 2) // 50-100% for upload if converted
                      : progress // 0-100% if no conversion
                  }
                : uf
            )
          );
        },
      });

      if (!result.success) {
        setUploadFiles(prev =>
          prev.map(uf =>
            uf.id === uploadFile.id
              ? {
                  ...uf,
                  status: 'error' as const,
                  error: result.error || 'Upload failed'
                }
              : uf
          )
        );
        return;
      }

      // Save metadata to database
      console.log('Saving metadata for:', fileToUpload.name, 'Path:', result.path);
      const metadata = await saveFileMetadata({
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
        storage_path: result.path || '',
      });

      console.log('Metadata saved:', metadata);

      // Mark as success
      setUploadFiles(prev =>
        prev.map(uf =>
          uf.id === uploadFile.id
            ? {
                ...uf,
                status: 'success' as const,
                progress: 100,
                url: result.url,
                documentId: metadata.documentId
              }
            : uf
        )
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadFiles(prev =>
        prev.map(uf =>
          uf.id === uploadFile.id
            ? {
                ...uf,
                status: 'error' as const,
                error: error.message || 'Upload failed'
              }
            : uf
        )
      );
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      rejectedFiles.forEach(rejection => {
        const error = rejection.errors[0];
        toast.error(`${rejection.file.name}: ${error.message}`);
      });

      // Check max files limit
      if (uploadFiles.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate and add files
      const newUploadFiles: UploadFile[] = [];
      
      for (const file of acceptedFiles) {
        const validation = validateFile(file);
        
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        const uploadFile: UploadFile = {
          file,
          id: `${Date.now()}-${Math.random()}`,
          progress: 0,
          status: 'pending',
          needsConversion: needsConversion(file),
        };

        newUploadFiles.push(uploadFile);
      }

      if (newUploadFiles.length > 0) {
        setUploadFiles(prev => [...prev, ...newUploadFiles]);
        
        // Start uploading all files
        const uploadPromises = newUploadFiles.map(async (uploadFile) => {
          try {
            await simulateUpload(uploadFile);
            return uploadFile;
          } catch (error) {
            setUploadFiles(prev =>
              prev.map(uf =>
                uf.id === uploadFile.id
                  ? {
                      ...uf,
                      status: 'error' as const,
                      error: 'Upload failed. Please try again.'
                    }
                  : uf
              )
            );
            return null;
          }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        // Get the updated upload files with documentIds
        setUploadFiles(current => {
          const successFiles = current.filter(uf => 
            newUploadFiles.some(nuf => nuf.id === uf.id) && uf.status === 'success'
          );
          
          // Notify parent component with completed uploads
          if (successFiles.length > 0) {
            onUploadComplete?.(
              successFiles.map(uf => uf.file),
              successFiles
            );
          }
          
          return current;
        });
      }
    },
    [uploadFiles, maxFiles, maxSizeBytes, onUploadComplete]
  );

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(uf => uf.id !== id));
  };

  const retryUpload = async (id: string) => {
    const uploadFile = uploadFiles.find(uf => uf.id === id);
    if (!uploadFile) return;

    setUploadFiles(prev =>
      prev.map(uf =>
        uf.id === id ? { ...uf, status: 'pending' as const, progress: 0, error: undefined } : uf
      )
    );

    try {
      await simulateUpload(uploadFile);
    } catch (error) {
      setUploadFiles(prev =>
        prev.map(uf =>
          uf.id === id
            ? {
                ...uf,
                status: 'error' as const,
                error: 'Upload failed. Please try again.'
              }
            : uf
        )
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'application/vnd.oasis.opendocument.text': ['.odt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff'],
      'image/webp': ['.webp'],
    },
    maxSize: maxSizeBytes,
    multiple: maxFiles > 1,
    disabled: uploadFiles.length >= maxFiles
  });

  const hasFiles = uploadFiles.length > 0;
  const isDisabled = uploadFiles.length >= maxFiles;

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 md:p-12 transition-all cursor-pointer
          ${isDragActive
            ? 'border-primary bg-primary/5 shadow-glow'
            : isDisabled
            ? 'border-muted bg-muted/20 cursor-not-allowed opacity-50'
            : 'border-border hover:border-primary hover:bg-muted/50'
          }
        `}
      >
        <input {...getInputProps()} disabled={isDisabled} />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
            isDragActive ? 'bg-primary/20' : 'bg-primary/10'
          }`}>
            <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary animate-bounce' : 'text-primary'}`} />
          </div>
          <div>
            <p className="text-lg font-medium mb-1">
              {isDragActive
                ? 'Drop your files here'
                : isDisabled
                ? `Maximum ${maxFiles} files reached`
                : 'Drop your PDF, image, or document files or click to browse'
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {isDisabled
                ? 'Remove files to upload more'
                : `PDF, DOC, DOCX, TXT, RTF, ODT, JPG, PNG and more • Up to ${maxFiles} files, ${maxSizeMB}MB each`
              }
            </p>
          </div>
          {!isDisabled && (
            <Button size="lg" variant="outline" type="button">
              Choose Files
            </Button>
          )}
        </div>
      </div>

      {/* Upload List */}
      {hasFiles && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Uploaded Files ({uploadFiles.length}/{maxFiles})
          </h3>
          <div className="space-y-2">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="shrink-0">
                    {uploadFile.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : uploadFile.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : uploadFile.status === 'converting' ? (
                      <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                    ) : uploadFile.status === 'uploading' ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                        {uploadFile.needsConversion && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            → PDF
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                    </div>

                    {/* Progress Bar - Converting */}
                    {uploadFile.status === 'converting' && (
                      <div className="space-y-1">
                        <Progress value={uploadFile.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Converting to PDF... {uploadFile.progress}%
                        </p>
                      </div>
                    )}

                    {/* Progress Bar - Uploading */}
                    {uploadFile.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={uploadFile.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {uploadFile.needsConversion ? 'Uploading PDF...' : 'Uploading...'} {uploadFile.progress}%
                        </p>
                      </div>
                    )}

                    {/* Success Message */}
                    {uploadFile.status === 'success' && (
                      <p className="text-xs text-success">
                        {uploadFile.needsConversion ? 'Converted and uploaded!' : 'Upload complete!'}
                      </p>
                    )}

                    {/* Error Message */}
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-destructive">{uploadFile.error}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => retryUpload(uploadFile.id)}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeFile(uploadFile.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
