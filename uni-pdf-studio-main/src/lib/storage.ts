import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

const DEFAULT_BUCKET = "documents";

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param options - Upload options (bucket, folder, progress callback)
 * @returns Upload result with URL and path
 */
export const uploadFileToStorage = async (
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    const { bucket = DEFAULT_BUCKET, folder, onProgress } = options;

    // Get current user ID for folder structure
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomString}.${extension}`;
    
    // Use user ID as folder for organization
    const filePath = `${userId}/${fileName}`;

    // Simulate progress (Supabase doesn't provide upload progress natively)
    let uploadProgress = 0;
    const progressInterval = setInterval(() => {
      uploadProgress += 10;
      if (uploadProgress <= 90) {
        onProgress?.(uploadProgress);
      }
    }, 100);

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    clearInterval(progressInterval);
    onProgress?.(100);

    if (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message || "Failed to upload file",
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error("Upload exception:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
};

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Array of upload results
 */
export const uploadMultipleFiles = async (
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFileToStorage(file, options);
    results.push(result);
  }

  return results;
};

/**
 * Delete a file from Supabase Storage
 * @param path - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Success status
 */
export const deleteFileFromStorage = async (
  path: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Delete exception:", error);
    toast.error("An error occurred while deleting");
    return false;
  }
};

/**
 * Get signed URL for private files
 * @param path - Path to the file in storage
 * @param bucket - Storage bucket name
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export const getSignedUrl = async (
  path: string,
  bucket: string = DEFAULT_BUCKET,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Signed URL exception:", error);
    return null;
  }
};

/**
 * List files in a folder
 * @param folder - Folder path
 * @param bucket - Storage bucket name
 * @returns Array of file objects
 */
export const listFiles = async (
  folder: string = "",
  bucket: string = DEFAULT_BUCKET
) => {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("List files error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("List files exception:", error);
    return [];
  }
};

/**
 * Save file metadata to database
 * @param metadata - File metadata object
 * @returns Success status and document ID
 */
export const saveFileMetadata = async (metadata: {
  name: string;
  size: number;
  type: string;
  storage_path: string;
  user_id?: string;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await (supabase as any)
      .from("documents")
      .insert({
        file_name: metadata.name,
        file_size: metadata.size,
        file_type: metadata.type,
        storage_path: metadata.storage_path,
        user_id: user?.id || metadata.user_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Save metadata error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, documentId: data?.id };
  } catch (error: any) {
    console.error("Save metadata exception:", error);
    return { success: false, error: error.message };
  }
};
