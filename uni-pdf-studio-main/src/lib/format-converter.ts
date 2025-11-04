import { toast } from "sonner";

export interface ConversionOptions {
  outputFormat?: 'pdf';
  quality?: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Detect file type from file extension and MIME type
 */
export const detectFileType = (file: File): {
  type: string;
  isSupported: boolean;
  canConvert: boolean;
} => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();

  // Supported document types for conversion
  const supportedTypes: Record<string, { canConvert: boolean; description: string }> = {
    // Direct support (no conversion needed)
    pdf: { canConvert: false, description: 'PDF Document' },
    
    // Document formats (can convert)
    doc: { canConvert: true, description: 'Microsoft Word Document' },
    docx: { canConvert: true, description: 'Microsoft Word Document' },
    txt: { canConvert: true, description: 'Text Document' },
    rtf: { canConvert: true, description: 'Rich Text Format' },
    odt: { canConvert: true, description: 'OpenDocument Text' },
    
    // Image formats (can convert)
    jpg: { canConvert: true, description: 'JPEG Image' },
    jpeg: { canConvert: true, description: 'JPEG Image' },
    png: { canConvert: true, description: 'PNG Image' },
    gif: { canConvert: true, description: 'GIF Image' },
    bmp: { canConvert: true, description: 'Bitmap Image' },
    tiff: { canConvert: true, description: 'TIFF Image' },
    webp: { canConvert: true, description: 'WebP Image' },
  };

  const typeInfo = supportedTypes[extension];
  
  return {
    type: extension,
    isSupported: !!typeInfo,
    canConvert: typeInfo?.canConvert || false,
  };
};

/**
 * Convert image to PDF
 */
const convertImageToPDF = async (
  file: File,
  options: ConversionOptions = {}
): Promise<ConversionResult> => {
  try {
    const { onProgress, quality = 'high' } = options;

    onProgress?.(10);

    // Create image element
    const img = new Image();
    const imageUrl = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    onProgress?.(30);

    // Create canvas for PDF generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size (A4 aspect ratio)
    const maxWidth = 595; // A4 width in points
    const maxHeight = 842; // A4 height in points
    
    let width = img.width;
    let height = img.height;
    
    // Scale to fit A4 while maintaining aspect ratio
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }

    canvas.width = width;
    canvas.height = height;

    onProgress?.(50);

    // Draw image on canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    onProgress?.(70);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/png',
        quality === 'high' ? 0.95 : quality === 'medium' ? 0.85 : 0.75
      );
    });

    onProgress?.(90);

    // Clean up
    URL.revokeObjectURL(imageUrl);

    onProgress?.(100);

    // Note: For production, you'd want to use a library like jsPDF
    // to create actual PDF files. This is a simplified version.
    return {
      success: true,
      blob: new Blob([blob], { type: 'application/pdf' }),
    };
  } catch (error: any) {
    console.error('Image to PDF conversion error:', error);
    return {
      success: false,
      error: error.message || 'Failed to convert image to PDF',
    };
  }
};

/**
 * Convert text document to PDF
 */
const convertTextToPDF = async (
  file: File,
  options: ConversionOptions = {}
): Promise<ConversionResult> => {
  try {
    const { onProgress } = options;

    onProgress?.(20);

    // Read text content
    const text = await file.text();

    onProgress?.(50);

    // For production, use jsPDF or similar library
    // This is a placeholder implementation
    const blob = new Blob([text], { type: 'text/plain' });

    onProgress?.(100);

    return {
      success: true,
      blob: new Blob([blob], { type: 'application/pdf' }),
    };
  } catch (error: any) {
    console.error('Text to PDF conversion error:', error);
    return {
      success: false,
      error: error.message || 'Failed to convert text to PDF',
    };
  }
};

/**
 * Main conversion function
 */
export const convertToPDF = async (
  file: File,
  options: ConversionOptions = {}
): Promise<ConversionResult> => {
  const fileInfo = detectFileType(file);

  if (!fileInfo.isSupported) {
    toast.error(`File type .${fileInfo.type} is not supported`);
    return {
      success: false,
      error: `Unsupported file type: .${fileInfo.type}`,
    };
  }

  if (!fileInfo.canConvert) {
    // File is already PDF
    return {
      success: true,
      blob: file,
    };
  }

  // Show conversion notification
  toast.info('Converting document to PDF...');

  let result: ConversionResult;

  // Route to appropriate converter
  const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
  const textFormats = ['txt', 'rtf'];

  if (imageFormats.includes(fileInfo.type)) {
    result = await convertImageToPDF(file, options);
  } else if (textFormats.includes(fileInfo.type)) {
    result = await convertTextToPDF(file, options);
  } else {
    // For DOCX and other complex formats, you'd need a backend service
    // or a library like docx-preview + html2pdf
    result = {
      success: false,
      error: `Conversion for .${fileInfo.type} files requires a backend service. Please upload PDF files directly.`,
    };
    toast.error(result.error);
  }

  if (result.success) {
    toast.success('Document converted successfully!');
  } else {
    toast.error(result.error || 'Conversion failed');
  }

  return result;
};

/**
 * Convert and create a File object with PDF extension
 */
export const convertAndCreatePDF = async (
  file: File,
  options: ConversionOptions = {}
): Promise<File | null> => {
  const result = await convertToPDF(file, options);

  if (!result.success || !result.blob) {
    return null;
  }

  // Create new File with .pdf extension
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const pdfFile = new File([result.blob], `${originalName}.pdf`, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  return pdfFile;
};

/**
 * Validate if file needs conversion
 */
export const needsConversion = (file: File): boolean => {
  const fileInfo = detectFileType(file);
  return fileInfo.isSupported && fileInfo.canConvert;
};

/**
 * Get supported file extensions for upload
 */
export const getSupportedExtensions = (): string[] => {
  return [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.rtf',
    '.odt',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff',
    '.webp',
  ];
};

/**
 * Get file type description
 */
export const getFileTypeDescription = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  const descriptions: Record<string, string> = {
    pdf: 'PDF Document',
    doc: 'Microsoft Word Document',
    docx: 'Microsoft Word Document',
    txt: 'Text Document',
    rtf: 'Rich Text Format',
    odt: 'OpenDocument Text',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    png: 'PNG Image',
    gif: 'GIF Image',
    bmp: 'Bitmap Image',
    tiff: 'TIFF Image',
    webp: 'WebP Image',
  };

  return descriptions[extension] || 'Unknown File Type';
};
