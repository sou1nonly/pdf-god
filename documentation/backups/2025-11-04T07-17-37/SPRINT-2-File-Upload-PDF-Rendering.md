# Sprint 2: File Upload & PDF Rendering

**Duration:** 2 weeks  
**Sprint Goal:** Implement file upload, storage, and basic PDF viewing functionality

---

## Sprint Planning

### User Stories

#### US-2.1: File Upload Interface
**As a** user  
**I want** to upload PDF files via drag-and-drop  
**So that** I can view and edit them

**Story Points:** 5  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Drag-and-drop zone with visual feedback
- [ ] Click to browse file system
- [ ] Support for PDF, DOCX, images (JPG, PNG)
- [ ] File size validation (max 100MB)
- [ ] Upload progress indicator
- [ ] Error handling for invalid files

---

#### US-2.2: Cloud Storage Integration
**As a** system  
**I need** to store uploaded files securely  
**So that** users can access them later

**Story Points:** 8  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Firebase Storage configured
- [ ] File upload to cloud storage
- [ ] Unique file naming (UUID + timestamp)
- [ ] File metadata saved to database
- [ ] Storage quota tracking per user
- [ ] File deletion from storage

---

#### US-2.3: PDF Rendering Engine
**As a** user  
**I want** to view PDF documents in the browser  
**So that** I can read and analyze them

**Story Points:** 8  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] PDF.js integrated
- [ ] PDF renders on canvas
- [ ] Multi-page support
- [ ] Page navigation (prev/next)
- [ ] Zoom controls (fit, 50%, 100%, 200%)
- [ ] Smooth rendering performance

---

#### US-2.4: Document List View
**As a** user  
**I want** to see all my uploaded documents  
**So that** I can select one to edit

**Story Points:** 5  
**Priority:** High

**Acceptance Criteria:**
- [ ] List view with thumbnails
- [ ] Document title, size, date displayed
- [ ] Sort by name, date, size
- [ ] Search functionality
- [ ] Delete document action
- [ ] Open document action

---

#### US-2.5: Format Conversion (DOCX to PDF)
**As a** user  
**I want** to upload DOCX files  
**So that** I can convert and edit them as PDFs

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] DOCX file detection
- [ ] Server-side conversion to PDF
- [ ] Converted file stored
- [ ] Original formatting preserved
- [ ] Conversion error handling

---

## Sprint Backlog (Tasks)

### File Upload Interface (US-2.1)

**Task 2.1.1:** Create FileUpload component
```tsx
// client/src/components/common/FileUpload.tsx
export const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleDrop = (e: DragEvent) => {
    // Prevent default, get files, validate, upload
  };
  
  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={isDragging ? 'border-blue-500' : 'border-gray-300'}
    >
      {/* Upload UI */}
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 2.1.2:** Implement file validation
```typescript
// client/src/utils/fileValidation.ts
export const validateFile = (file: File) => {
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > 100 * 1024 * 1024) { // 100MB
    throw new Error('File too large');
  }
  
  return true;
};
```
- **Estimated:** 2 hours

**Task 2.1.3:** Create upload progress UI
- Progress bar component
- Percentage display
- Cancel upload button
- **Estimated:** 2 hours

**Task 2.1.4:** Add loading states and error messages
- **Estimated:** 2 hours

---

### Cloud Storage (US-2.2)

**Task 2.2.1:** Setup Firebase Storage
```bash
npm install firebase-admin
```
- Initialize Firebase Admin SDK
- Configure storage bucket
- **Estimated:** 2 hours

**Task 2.2.2:** Create file upload API endpoint
```typescript
// server/src/controllers/documentController.ts
export const uploadDocument = async (req, res) => {
  const file = req.file; // using multer middleware
  const userId = req.user.id;
  
  // 1. Generate unique filename
  const filename = `${userId}/${Date.now()}_${file.originalname}`;
  
  // 2. Upload to Firebase Storage
  const fileUrl = await uploadToStorage(file.buffer, filename);
  
  // 3. Save metadata to database
  const document = await Document.create({
    title: file.originalname,
    owner: userId,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype
  });
  
  // 4. Update user storage usage
  await User.findByIdAndUpdate(userId, {
    $inc: { storageUsed: file.size }
  });
  
  res.json({ document });
};
```
- **Estimated:** 4 hours

**Task 2.2.3:** Install and configure Multer
```typescript
// server/src/middleware/upload.ts
import multer from 'multer';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    // Validate file type
  }
});
```
- **Estimated:** 2 hours

**Task 2.2.4:** Implement storage quota check
```typescript
// server/src/middleware/checkQuota.ts
export const checkStorageQuota = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const fileSize = req.headers['content-length'];
  
  if (user.storageUsed + fileSize > user.storageLimit) {
    return res.status(413).json({ 
      error: 'Storage quota exceeded' 
    });
  }
  
  next();
};
```
- **Estimated:** 2 hours

**Task 2.2.5:** Create file deletion endpoint
```typescript
// DELETE /api/documents/:id
export const deleteDocument = async (req, res) => {
  // 1. Find document
  // 2. Delete from storage
  // 3. Delete from database
  // 4. Update user storage usage
};
```
- **Estimated:** 3 hours

---

### PDF Rendering (US-2.3)

**Task 2.3.1:** Install PDF.js
```bash
npm install pdfjs-dist
```
- **Estimated:** 0.5 hours

**Task 2.3.2:** Create PDFViewer component
```tsx
// client/src/components/editor/PDFViewer.tsx
import * as pdfjsLib from 'pdfjs-dist';

export const PDFViewer = ({ fileUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  
  useEffect(() => {
    loadPDF();
  }, [fileUrl]);
  
  const loadPDF = async () => {
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    setPdf(pdf);
    setNumPages(pdf.numPages);
    renderPage(1);
  };
  
  const renderPage = async (num: number) => {
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
  };
  
  return (
    <div>
      <canvas ref={canvasRef} />
      {/* Navigation controls */}
    </div>
  );
};
```
- **Estimated:** 6 hours

**Task 2.3.3:** Add page navigation controls
- Previous/Next buttons
- Page number input (Go to page X)
- Page indicator (Page X of Y)
- **Estimated:** 2 hours

**Task 2.3.4:** Implement zoom controls
- Zoom in/out buttons (+/-)
- Zoom select dropdown (50%, 75%, 100%, 125%, 150%, 200%)
- Fit to width button
- Fit to page button
- **Estimated:** 3 hours

**Task 2.3.5:** Add thumbnail sidebar
```tsx
// client/src/components/editor/ThumbnailSidebar.tsx
// Render mini versions of all pages
// Click to jump to page
```
- **Estimated:** 4 hours

**Task 2.3.6:** Optimize rendering performance
- Lazy load pages
- Cache rendered pages
- Debounce zoom/scroll events
- **Estimated:** 3 hours

---

### Document List (US-2.4)

**Task 2.4.1:** Create API endpoint for document list
```typescript
// GET /api/documents
export const getUserDocuments = async (req, res) => {
  const { sort, search } = req.query;
  const userId = req.user.id;
  
  const query = { owner: userId };
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }
  
  const documents = await Document.find(query)
    .sort(sort || '-createdAt')
    .select('title fileSize createdAt thumbnail');
  
  res.json({ documents });
};
```
- **Estimated:** 2 hours

**Task 2.4.2:** Create DocumentCard component
```tsx
// client/src/components/common/DocumentCard.tsx
export const DocumentCard = ({ document }) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg">
      <img src={document.thumbnail} alt={document.title} />
      <h3>{document.title}</h3>
      <p>{formatFileSize(document.fileSize)}</p>
      <p>{formatDate(document.createdAt)}</p>
      <button onClick={() => openDocument(document.id)}>Open</button>
      <button onClick={() => deleteDocument(document.id)}>Delete</button>
    </div>
  );
};
```
- **Estimated:** 3 hours

**Task 2.4.3:** Create DocumentList view
- Grid layout for cards
- Loading skeleton
- Empty state ("No documents yet")
- **Estimated:** 3 hours

**Task 2.4.4:** Add search functionality
- Search input with debounce
- Filter documents by title
- **Estimated:** 2 hours

**Task 2.4.5:** Add sort functionality
- Sort dropdown (Name, Date, Size)
- Ascending/descending toggle
- **Estimated:** 2 hours

**Task 2.4.6:** Generate thumbnails
```typescript
// server/src/utils/thumbnail.ts
import { createCanvas } from 'canvas';

export const generateThumbnail = async (pdfBuffer: Buffer) => {
  // Render first page at low resolution
  // Convert to JPEG
  // Upload to storage
  // Return thumbnail URL
};
```
- **Estimated:** 4 hours

---

### DOCX Conversion (US-2.5)

**Task 2.5.1:** Install conversion library
```bash
npm install mammoth  # or libre-office via command line
```
- **Estimated:** 0.5 hours

**Task 2.5.2:** Create conversion service
```typescript
// server/src/services/conversionService.ts
import mammoth from 'mammoth';
import PDFKit from 'pdfkit';

export const convertDOCXtoPDF = async (docxBuffer: Buffer): Promise<Buffer> => {
  // 1. Extract HTML from DOCX
  const result = await mammoth.convertToHtml({ buffer: docxBuffer });
  const html = result.value;
  
  // 2. Convert HTML to PDF (using puppeteer or pdfkit)
  const pdf = await generatePDFFromHTML(html);
  
  return pdf;
};
```
- **Estimated:** 5 hours

**Task 2.5.3:** Integrate conversion in upload flow
```typescript
// In uploadDocument controller
if (file.mimetype === 'application/vnd.openxmlformats-...') {
  const pdfBuffer = await convertDOCXtoPDF(file.buffer);
  // Upload converted PDF instead
}
```
- **Estimated:** 2 hours

**Task 2.5.4:** Add conversion status UI
- Show "Converting..." message
- Progress indicator
- **Estimated:** 2 hours

---

## Definition of Done (DoD)

- [ ] Code is peer-reviewed
- [ ] Unit tests written and passing
- [ ] PDF renders correctly (visual testing)
- [ ] File upload/download works end-to-end
- [ ] No memory leaks (check with React DevTools)
- [ ] Mobile responsiveness verified
- [ ] Storage quota limits enforced
- [ ] Error handling covers edge cases

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Format:** Async or sync depending on team availability

### Sprint Review (2 hours)
**Demo:**
- Upload a PDF and view it
- Navigate through pages
- Zoom in/out
- Upload DOCX and see conversion
- View document list
- Delete document

### Sprint Retrospective (1.5 hours)
**Discussion points:**
- PDF.js learning curve
- Storage performance
- File conversion challenges

---

## Technical Debt & Risks

**Risks:**
1. Large PDF files may cause browser memory issues
2. DOCX conversion accuracy depends on document complexity
3. Firebase Storage costs may escalate with usage
4. PDF.js worker configuration for production

**Technical Debt:**
- Add worker threads for PDF.js (performance)
- Implement client-side caching (IndexedDB)
- Add image-to-PDF conversion (Sprint 3)
- Optimize thumbnail generation (lazy load)

---

## Sprint Velocity

**Estimated Story Points:** 31  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

- [ ] Upload PDF < 1MB (fast)
- [ ] Upload PDF > 50MB (slow, test progress)
- [ ] Upload invalid file type (should fail)
- [ ] Upload file exceeding quota (should fail)
- [ ] Render single-page PDF
- [ ] Render 100-page PDF (performance test)
- [ ] Zoom to 500% (test canvas scaling)
- [ ] Navigate quickly through pages
- [ ] Delete document (confirm removed from storage)
- [ ] Upload DOCX with images/tables
- [ ] Search documents by name
- [ ] Sort documents

---

## Notes

- PDF.js worker must be configured correctly for production build
- Consider CDN for serving PDF files (faster loading)
- Monitor Firebase Storage usage and costs
- Keep original DOCX file alongside converted PDF for future re-conversion
