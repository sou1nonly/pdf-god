import { toast } from "sonner";
import jsPDF from 'jspdf';

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

    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    onProgress?.(50);

    // Get PDF page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions to fit page while maintaining aspect ratio
    const imgWidth = img.width;
    const imgHeight = img.height;
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    // Center the image on the page
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    onProgress?.(70);

    // Add image to PDF
    const imageFormat = file.type.split('/')[1].toUpperCase();
    console.log('Adding image to PDF - Format:', imageFormat, 'Dimensions:', finalWidth, 'x', finalHeight);
    
    pdf.addImage(
      imageUrl,
      imageFormat === 'JPG' ? 'JPEG' : imageFormat,
      x,
      y,
      finalWidth,
      finalHeight,
      undefined,
      quality === 'high' ? 'SLOW' : quality === 'medium' ? 'MEDIUM' : 'FAST'
    );

    onProgress?.(90);

    // Convert to blob
    const pdfBlob = pdf.output('blob');
    console.log('PDF blob created - Size:', pdfBlob.size, 'Type:', pdfBlob.type);

    // Clean up
    URL.revokeObjectURL(imageUrl);

    onProgress?.(100);

    return {
      success: true,
      blob: pdfBlob,
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

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set font
    pdf.setFontSize(12);
    
    // Split text into lines that fit the page width
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    
    const lines = pdf.splitTextToSize(text, maxLineWidth);
    
    // Add text to PDF with pagination
    const lineHeight = 7;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxLinesPerPage = Math.floor((pageHeight - (margin * 2)) / lineHeight);
    
    let currentPage = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineIndex = i % maxLinesPerPage;
      
      // Add new page if needed
      if (i > 0 && lineIndex === 0) {
        pdf.addPage();
        currentPage++;
      }
      
      // Add line to page
      pdf.text(lines[i], margin, margin + (lineIndex * lineHeight));
    }

    onProgress?.(90);

    // Convert to blob
    const pdfBlob = pdf.output('blob');

    onProgress?.(100);

    return {
      success: true,
      blob: pdfBlob,
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
  console.log('Converting file:', file.name, 'Type:', file.type);
  
  const result = await convertToPDF(file, options);

  if (!result.success || !result.blob) {
    console.error('Conversion failed:', result.error);
    return null;
  }

  // Create new File with .pdf extension
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const pdfFile = new File([result.blob], `${originalName}.pdf`, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  console.log('Converted file created:', pdfFile.name, 'Size:', pdfFile.size, 'Type:', pdfFile.type);

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
