# Sprint 5: OCR & Advanced File Management

**Duration:** 2 weeks  
**Sprint Goal:** Implement OCR for scanned documents and comprehensive file management operations (merge, split, compress, encrypt)

---

## Sprint Planning

### User Stories

#### US-5.1: OCR Processing
**As a** user  
**I want** to extract text from scanned PDFs  
**So that** I can search and edit scanned documents

**Story Points:** 13  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Automatically detect if PDF is scanned
- [ ] One-click OCR processing
- [ ] Multi-language support (10+ languages)
- [ ] Progress indicator during processing
- [ ] Editable text layer added to PDF
- [ ] Searchable after OCR

---

#### US-5.2: PDF Merge & Split
**As a** user  
**I want** to merge multiple PDFs or split one PDF  
**So that** I can organize documents efficiently

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Upload multiple PDFs to merge
- [ ] Drag to reorder before merging
- [ ] Select specific pages to merge
- [ ] Split PDF by page ranges
- [ ] Split every N pages
- [ ] Preview before finalizing

---

#### US-5.3: Page Management
**As a** user  
**I want** to reorder, delete, and rotate pages  
**So that** I can customize document structure

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Drag-and-drop page reordering
- [ ] Delete single or multiple pages
- [ ] Rotate pages (90°, 180°, 270°)
- [ ] Duplicate pages
- [ ] Insert blank pages
- [ ] Thumbnail view for all pages

---

#### US-5.4: PDF Compression & Optimization
**As a** user  
**I want** to compress large PDFs  
**So that** files are easier to share

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Compression levels (low, medium, high)
- [ ] Preview file size reduction
- [ ] Image quality adjustment
- [ ] Font subsetting
- [ ] Remove metadata
- [ ] Batch compression

---

#### US-5.5: PDF Security & Watermarks
**As a** user  
**I want** to password-protect and watermark PDFs  
**So that** documents are secure

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Set user password (open document)
- [ ] Set owner password (restrict editing)
- [ ] Permission settings (print, copy, modify)
- [ ] Add text watermark
- [ ] Add image watermark
- [ ] Watermark positioning and opacity

---

## Sprint Backlog (Tasks)

### OCR Processing (US-5.1)

**Task 5.1.1:** Set up Tesseract.js
```bash
npm install tesseract.js
```
```typescript
// client/src/services/ocrService.ts
import { createWorker } from 'tesseract.js';

export const performOCR = async (
  imageData: string,
  language: string = 'eng'
): Promise<string> => {
  const worker = await createWorker(language);
  
  const { data } = await worker.recognize(imageData);
  await worker.terminate();
  
  return data.text;
};
```
- **Estimated:** 2 hours

**Task 5.1.2:** Detect if PDF is scanned
```typescript
// server/src/services/pdfAnalysisService.ts
import pdf from 'pdf-parse';

export const isScannedPDF = async (pdfBuffer: Buffer): Promise<boolean> => {
  const data = await pdf(pdfBuffer);
  
  // If text content is very low but file size is large, likely scanned
  const textLength = data.text.replace(/\s/g, '').length;
  const fileSizeKB = pdfBuffer.length / 1024;
  
  const textDensity = textLength / fileSizeKB;
  
  // Heuristic: < 10 chars per KB suggests scanned
  return textDensity < 10;
};
```
- **Estimated:** 3 hours

**Task 5.1.3:** Integrate Google Vision API for premium OCR
```bash
npm install @google-cloud/vision
```
```typescript
// server/src/services/googleVisionService.ts
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

export const performVisionOCR = async (
  imageBuffer: Buffer,
  language: string = 'en'
): Promise<string> => {
  const [result] = await client.textDetection({
    image: { content: imageBuffer },
    imageContext: { languageHints: [language] }
  });
  
  return result.fullTextAnnotation?.text || '';
};
```
- **Estimated:** 3 hours

**Task 5.1.4:** Convert PDF pages to images for OCR
```typescript
// server/src/services/pdfToImageService.ts
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

export const convertPageToImage = async (
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer> => {
  // Use pdf-lib to extract page
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const [page] = await pdfDoc.copyPages(pdfDoc, [pageNumber]);
  
  const newDoc = await PDFDocument.create();
  newDoc.addPage(page);
  const singlePagePdf = await newDoc.save();
  
  // Convert to image using sharp (requires pdftoppm)
  // Alternative: use pdf-poppler or similar
  const image = await convertPDFToImage(singlePagePdf);
  
  return image;
};
```
- **Estimated:** 4 hours

**Task 5.1.5:** Create OCR processing endpoint
```typescript
// server/src/routes/ocr.routes.ts
router.post('/ocr/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { language = 'eng', usePremium = false } = req.body;
    
    const document = await Document.findById(documentId);
    const pdfBuffer = await getDocumentBuffer(document.fileUrl);
    
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    let allText = '';
    
    for (let i = 0; i < pageCount; i++) {
      const imageBuffer = await convertPageToImage(pdfBuffer, i);
      
      const text = usePremium
        ? await performVisionOCR(imageBuffer, language)
        : await performOCR(imageBuffer.toString('base64'), language);
      
      allText += `\n--- Page ${i + 1} ---\n${text}\n`;
      
      // Send progress update
      res.write(`data: ${JSON.stringify({ progress: (i + 1) / pageCount * 100 })}\n\n`);
    }
    
    // Save OCR result
    await OCRResult.create({
      document: documentId,
      text: allText,
      language,
      method: usePremium ? 'google-vision' : 'tesseract',
      createdAt: new Date()
    });
    
    res.json({ text: allText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
- **Estimated:** 5 hours

**Task 5.1.6:** Build OCR UI with progress
```tsx
// client/src/components/ocr/OCRPanel.tsx
export const OCRPanel = ({ documentId }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [language, setLanguage] = useState('eng');
  
  const handleOCR = async () => {
    setProcessing(true);
    
    // Use EventSource for progress updates
    const eventSource = new EventSource(
      `/api/ocr/${documentId}?language=${language}`
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      setProcessing(false);
    };
    
    // Also make POST request
    const response = await fetch(`/api/ocr/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language })
    });
    
    const data = await response.json();
    setResult(data.text);
    setProcessing(false);
  };
  
  return (
    <div className="ocr-panel">
      <h3>OCR Processing</h3>
      
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="eng">English</option>
        <option value="spa">Spanish</option>
        <option value="fra">French</option>
        <option value="deu">German</option>
        <option value="ita">Italian</option>
        <option value="por">Portuguese</option>
        <option value="rus">Russian</option>
        <option value="ara">Arabic</option>
        <option value="chi_sim">Chinese (Simplified)</option>
        <option value="jpn">Japanese</option>
      </select>
      
      <button onClick={handleOCR} disabled={processing}>
        {processing ? 'Processing...' : 'Start OCR'}
      </button>
      
      {processing && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      
      {result && (
        <div className="ocr-result">
          <h4>Extracted Text</h4>
          <textarea value={result} readOnly rows={20} />
          <button onClick={() => navigator.clipboard.writeText(result)}>
            Copy Text
          </button>
        </div>
      )}
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 5.1.7:** Add searchable text layer to PDF
```typescript
// server/src/services/pdfOCRService.ts
export const addTextLayerToPDF = async (
  pdfBuffer: Buffer,
  ocrResults: { page: number; text: string; bounds: any }[]
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  ocrResults.forEach(({ page, text, bounds }) => {
    const pdfPage = pdfDoc.getPage(page);
    
    // Add invisible text at correct coordinates
    pdfPage.drawText(text, {
      x: bounds.x,
      y: bounds.y,
      size: 1,
      opacity: 0, // Invisible
      color: rgb(0, 0, 0)
    });
  });
  
  return await pdfDoc.save();
};
```
- **Estimated:** 4 hours

---

### PDF Merge & Split (US-5.2)

**Task 5.2.1:** Implement PDF merge service
```typescript
// server/src/services/pdfMergeService.ts
import { PDFDocument } from 'pdf-lib';

export const mergePDFs = async (
  pdfBuffers: Buffer[],
  pageSelections?: number[][] // Optional: specific pages from each PDF
): Promise<Buffer> => {
  const mergedPdf = await PDFDocument.create();
  
  for (let i = 0; i < pdfBuffers.length; i++) {
    const pdfDoc = await PDFDocument.load(pdfBuffers[i]);
    
    const pageIndices = pageSelections?.[i] || 
      Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
    
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  
  return Buffer.from(await mergedPdf.save());
};
```
- **Estimated:** 3 hours

**Task 5.2.2:** Create merge UI with drag-and-drop
```tsx
// client/src/components/merge/MergePanel.tsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export const MergePanel = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  
  const handleDrop = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(files);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setFiles(items);
  };
  
  const handleMerge = async () => {
    setMerging(true);
    
    const formData = new FormData();
    files.forEach(file => formData.append('pdfs', file));
    
    const response = await fetch('/api/pdf/merge', {
      method: 'POST',
      body: formData
    });
    
    const blob = await response.blob();
    downloadBlob(blob, 'merged.pdf');
    
    setMerging(false);
  };
  
  return (
    <div className="merge-panel">
      <h3>Merge PDFs</h3>
      
      <input
        type="file"
        multiple
        accept=".pdf"
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />
      
      <DragDropContext onDragEnd={handleDrop}>
        <Droppable droppableId="files">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {files.map((file, index) => (
                <Draggable key={file.name} draggableId={file.name} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="file-item"
                    >
                      <span>📄 {file.name}</span>
                      <button onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                        ✕
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <button onClick={handleMerge} disabled={files.length < 2 || merging}>
        Merge {files.length} PDFs
      </button>
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 5.2.3:** Implement PDF split service
```typescript
// server/src/services/pdfSplitService.ts
export const splitPDF = async (
  pdfBuffer: Buffer,
  ranges: { start: number; end: number }[]
): Promise<Buffer[]> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const splitPdfs: Buffer[] = [];
  
  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start + i
    );
    
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));
    
    splitPdfs.push(Buffer.from(await newPdf.save()));
  }
  
  return splitPdfs;
};

export const splitEveryNPages = async (
  pdfBuffer: Buffer,
  n: number
): Promise<Buffer[]> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < pageCount; i += n) {
    ranges.push({
      start: i,
      end: Math.min(i + n - 1, pageCount - 1)
    });
  }
  
  return await splitPDF(pdfBuffer, ranges);
};
```
- **Estimated:** 3 hours

**Task 5.2.4:** Create split UI
```tsx
// client/src/components/split/SplitPanel.tsx
export const SplitPanel = ({ documentId }) => {
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range');
  const [ranges, setRanges] = useState<string>('1-5, 6-10');
  const [everyN, setEveryN] = useState(5);
  
  const handleSplit = async () => {
    const body = splitMode === 'range'
      ? { ranges: parseRanges(ranges) }
      : { everyN };
    
    const response = await fetch(`/api/pdf/split/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    // Download all split PDFs
    data.files.forEach((file, i) => {
      downloadBlob(file, `split-${i + 1}.pdf`);
    });
  };
  
  return (
    <div className="split-panel">
      <h3>Split PDF</h3>
      
      <div className="mode-selector">
        <button onClick={() => setSplitMode('range')}>By Range</button>
        <button onClick={() => setSplitMode('every')}>Every N Pages</button>
      </div>
      
      {splitMode === 'range' ? (
        <input
          type="text"
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
          placeholder="e.g., 1-5, 6-10, 11-15"
        />
      ) : (
        <input
          type="number"
          value={everyN}
          onChange={(e) => setEveryN(Number(e.target.value))}
          min="1"
        />
      )}
      
      <button onClick={handleSplit}>Split PDF</button>
    </div>
  );
};
```
- **Estimated:** 3 hours

---

### Page Management (US-5.3)

**Task 5.3.1:** Create page reorder service
```typescript
// server/src/services/pageManagementService.ts
export const reorderPages = async (
  pdfBuffer: Buffer,
  newOrder: number[]
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const newPdf = await PDFDocument.create();
  
  const copiedPages = await newPdf.copyPages(pdfDoc, newOrder);
  copiedPages.forEach(page => newPdf.addPage(page));
  
  return Buffer.from(await newPdf.save());
};

export const deletePages = async (
  pdfBuffer: Buffer,
  pagesToDelete: number[]
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  
  const keepPages = Array.from({ length: pageCount }, (_, i) => i)
    .filter(i => !pagesToDelete.includes(i));
  
  return await reorderPages(pdfBuffer, keepPages);
};

export const rotatePages = async (
  pdfBuffer: Buffer,
  pageNumbers: number[],
  degrees: 90 | 180 | 270
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  pageNumbers.forEach(pageNum => {
    const page = pdfDoc.getPage(pageNum);
    page.setRotation(degrees);
  });
  
  return Buffer.from(await pdfDoc.save());
};
```
- **Estimated:** 3 hours

**Task 5.3.2:** Build page management UI
```tsx
// client/src/components/pages/PageManager.tsx
export const PageManager = ({ documentId }) => {
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  const handleDelete = async () => {
    await fetch(`/api/pdf/pages/delete/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ pages: selectedPages })
    });
    
    setPages(pages.filter((_, i) => !selectedPages.includes(i)));
    setSelectedPages([]);
  };
  
  const handleRotate = async (degrees: number) => {
    await fetch(`/api/pdf/pages/rotate/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ pages: selectedPages, degrees })
    });
    
    // Update thumbnails
    reloadThumbnails();
  };
  
  return (
    <div className="page-manager">
      <div className="toolbar">
        <button onClick={handleDelete} disabled={selectedPages.length === 0}>
          Delete
        </button>
        <button onClick={() => handleRotate(90)}>Rotate 90°</button>
        <button onClick={() => handleRotate(180)}>Rotate 180°</button>
        <button onClick={() => handleRotate(270)}>Rotate 270°</button>
      </div>
      
      <DragDropContext onDragEnd={handleReorder}>
        <Droppable droppableId="pages" direction="horizontal">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="page-grid">
              {pages.map((page, index) => (
                <Draggable key={page.id} draggableId={page.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`page-thumbnail ${selectedPages.includes(index) ? 'selected' : ''}`}
                      onClick={() => togglePageSelection(index)}
                    >
                      <img src={page.thumbnail} alt={`Page ${index + 1}`} />
                      <span>Page {index + 1}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
```
- **Estimated:** 4 hours

---

### PDF Compression (US-5.4)

**Task 5.4.1:** Implement compression service
```typescript
// server/src/services/pdfCompressionService.ts
import { PDFDocument, PDFImage } from 'pdf-lib';
import sharp from 'sharp';

export const compressPDF = async (
  pdfBuffer: Buffer,
  level: 'low' | 'medium' | 'high'
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  const qualitySettings = {
    low: { imageQuality: 90, maxWidth: 2000 },
    medium: { imageQuality: 70, maxWidth: 1500 },
    high: { imageQuality: 50, maxWidth: 1000 }
  };
  
  const settings = qualitySettings[level];
  
  // Compress images
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // Extract and compress images
    // (Simplified - actual implementation more complex)
  }
  
  // Remove metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  
  return Buffer.from(await pdfDoc.save({
    useObjectStreams: true, // Better compression
  }));
};
```
- **Estimated:** 4 hours

**Task 5.4.2:** Add compression UI
```tsx
// client/src/components/compress/CompressPanel.tsx
export const CompressPanel = ({ documentId, originalSize }) => {
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [compressing, setCompressing] = useState(false);
  const [newSize, setNewSize] = useState<number | null>(null);
  
  const handleCompress = async () => {
    setCompressing(true);
    
    const response = await fetch(`/api/pdf/compress/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ level })
    });
    
    const blob = await response.blob();
    setNewSize(blob.size);
    
    setCompressing(false);
  };
  
  const savings = newSize ? ((originalSize - newSize) / originalSize * 100) : 0;
  
  return (
    <div className="compress-panel">
      <h3>Compress PDF</h3>
      
      <p>Original size: {formatBytes(originalSize)}</p>
      
      <div className="compression-levels">
        <button onClick={() => setLevel('low')}>
          Low (90% quality)
        </button>
        <button onClick={() => setLevel('medium')}>
          Medium (70% quality)
        </button>
        <button onClick={() => setLevel('high')}>
          High (50% quality)
        </button>
      </div>
      
      <button onClick={handleCompress} disabled={compressing}>
        {compressing ? 'Compressing...' : 'Compress'}
      </button>
      
      {newSize && (
        <div className="results">
          <p>New size: {formatBytes(newSize)}</p>
          <p>Savings: {savings.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
};
```
- **Estimated:** 3 hours

---

### PDF Security (US-5.5)

**Task 5.5.1:** Implement encryption service
```typescript
// server/src/services/pdfSecurityService.ts
export const encryptPDF = async (
  pdfBuffer: Buffer,
  userPassword: string,
  ownerPassword: string,
  permissions: {
    printing: boolean;
    modifying: boolean;
    copying: boolean;
    annotating: boolean;
  }
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Set passwords and permissions
  // (pdf-lib doesn't support encryption directly, use pdf-lib with node-qpdf)
  
  return Buffer.from(await pdfDoc.save());
};
```
- **Estimated:** 4 hours

**Task 5.5.2:** Add watermark service
```typescript
// server/src/services/watermarkService.ts
export const addWatermark = async (
  pdfBuffer: Buffer,
  watermark: {
    type: 'text' | 'image';
    content: string; // text or image URL
    position: 'center' | 'top-right' | 'bottom-right';
    opacity: number;
  }
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  for (const page of pages) {
    if (watermark.type === 'text') {
      const { width, height } = page.getSize();
      const fontSize = 40;
      
      const positions = {
        center: { x: width / 2, y: height / 2 },
        'top-right': { x: width - 100, y: height - 50 },
        'bottom-right': { x: width - 100, y: 50 }
      };
      
      page.drawText(watermark.content, {
        x: positions[watermark.position].x,
        y: positions[watermark.position].y,
        size: fontSize,
        opacity: watermark.opacity,
        rotate: degrees(45)
      });
    }
  }
  
  return Buffer.from(await pdfDoc.save());
};
```
- **Estimated:** 3 hours

**Task 5.5.3:** Create security UI
```tsx
// client/src/components/security/SecurityPanel.tsx
export const SecurityPanel = ({ documentId }) => {
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [permissions, setPermissions] = useState({
    printing: true,
    modifying: false,
    copying: false,
    annotating: true
  });
  
  const handleEncrypt = async () => {
    await fetch(`/api/pdf/encrypt/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ userPassword, ownerPassword, permissions })
    });
  };
  
  return (
    <div className="security-panel">
      <h3>Protect PDF</h3>
      
      <input
        type="password"
        placeholder="User Password (to open)"
        value={userPassword}
        onChange={(e) => setUserPassword(e.target.value)}
      />
      
      <input
        type="password"
        placeholder="Owner Password (to edit)"
        value={ownerPassword}
        onChange={(e) => setOwnerPassword(e.target.value)}
      />
      
      <div className="permissions">
        <h4>Permissions</h4>
        <label>
          <input
            type="checkbox"
            checked={permissions.printing}
            onChange={(e) => setPermissions({ ...permissions, printing: e.target.checked })}
          />
          Allow Printing
        </label>
        <label>
          <input type="checkbox" checked={permissions.modifying} onChange={...} />
          Allow Modifying
        </label>
        <label>
          <input type="checkbox" checked={permissions.copying} onChange={...} />
          Allow Copying
        </label>
        <label>
          <input type="checkbox" checked={permissions.annotating} onChange={...} />
          Allow Annotating
        </label>
      </div>
      
      <button onClick={handleEncrypt}>Encrypt PDF</button>
    </div>
  );
};
```
- **Estimated:** 3 hours

---

## Definition of Done (DoD)

- [ ] OCR works on scanned PDFs
- [ ] Multi-language OCR tested
- [ ] PDF merge/split functional
- [ ] Page reordering smooth (drag-and-drop)
- [ ] Compression reduces file size
- [ ] Encryption protects PDF
- [ ] Watermarks display correctly
- [ ] Performance acceptable (< 30s for 100-page PDF)

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Key Focus:** OCR accuracy, compression algorithms, security implementation

### Sprint Review (2 hours)
**Demo:**
- OCR a scanned document
- Merge 3 PDFs
- Split PDF into sections
- Reorder pages via drag-and-drop
- Compress large PDF
- Add password protection
- Add watermark

### Sprint Retrospective (1.5 hours)
**Discuss:**
- OCR quality trade-offs
- Performance optimization strategies
- User experience of complex operations

---

## Technical Debt & Risks

**Risks:**
1. OCR processing time for large documents
2. Tesseract.js accuracy on poor-quality scans
3. Memory usage with large PDFs
4. Encryption library compatibility

**Technical Debt:**
- Implement background job queue for OCR (use Bull)
- Add PDF/A conversion for archiving
- Implement PDF repair for corrupted files
- Add batch operations (merge 50+ PDFs)

---

## Sprint Velocity

**Estimated Story Points:** 39  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

- [ ] OCR English document
- [ ] OCR Spanish document
- [ ] OCR document with poor scan quality
- [ ] Merge 10 PDFs
- [ ] Split 100-page PDF
- [ ] Reorder 20 pages
- [ ] Delete pages from middle of PDF
- [ ] Rotate pages 90°, 180°, 270°
- [ ] Compress 50MB PDF
- [ ] Test compression quality levels
- [ ] Encrypt PDF with user password
- [ ] Test permission restrictions
- [ ] Add text watermark
- [ ] Add image watermark

---

## Notes

- Tesseract.js good for basic OCR, Google Vision for high accuracy
- pdf-lib excellent for PDF manipulation
- Consider using worker threads for OCR to avoid blocking
- Test memory usage with 500+ page documents
- Compression quality vs. size is a trade-off—let users preview
