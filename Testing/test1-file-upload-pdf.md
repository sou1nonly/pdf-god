# Sprint 2 Testing Checklist

All tests for file upload, conversion, and PDF rendering features.

---

## Test 1: PDF File Upload
Upload basic PDF files without conversion.

**What to Test:**
- [ ] Drag and drop PDF file
- [ ] Click "Choose Files" to upload
- [ ] Progress bar shows 0-100%
- [ ] Shows "Upload complete!" message
- [ ] File appears with correct name and size

**Status**: [X] ❌ FAIL  
**Notes**: Bucket not found error when uploading. File shows as uploaded but PDF viewer just buffers and nothing shows. **Need to create storage bucket in Supabase dashboard - see SUPABASE-STORAGE-SETUP.md**

---

## Test 2: Image to PDF Conversion
Upload images that convert to PDF automatically.

**What to Test:**
- [ ] Upload JPG/PNG image
- [ ] Shows "→ PDF" indicator next to filename
- [ ] Status: "Converting to PDF..." (0-50%)
- [ ] Status: "Uploading PDF..." (50-100%)
- [ ] Success: "Converted and uploaded!"
- [ ] Try GIF, BMP, TIFF, WebP formats

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 3: Text to PDF Conversion
Upload text files that convert to PDF.

**What to Test:**
- [ ] Upload TXT file
- [ ] Shows "→ PDF" indicator
- [ ] Conversion and upload progress works
- [ ] Shows "Converted and uploaded!"
- [ ] Try RTF format (optional)

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 4: Multi-File Upload
Upload multiple files simultaneously.

**What to Test:**
- [ ] Upload 3-5 files together (PDF + images + text)
- [ ] Each file has independent progress bar
- [ ] Each file has independent status
- [ ] All files complete successfully
- [ ] Try uploading more than 5 files (should show error)

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 5: File Validation
Test error handling and validation.

**What to Test:**
- [ ] Upload unsupported file type (.zip, .exe)
- [ ] Shows error message
- [ ] Upload file larger than 100MB
- [ ] Shows size limit error
- [ ] Upload same file twice
- [ ] Shows duplicate error

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 6: Error Handling & Retry
Test upload failures and retry functionality.

**What to Test:**
- [ ] Upload file, then disconnect internet
- [ ] Shows error message
- [ ] Click "Retry" button
- [ ] File uploads successfully after retry
- [ ] Click "Remove" to delete file from queue

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 7: Document List View
View uploaded documents.

**What to Test:**
- [ ] Navigate to Documents page
- [ ] Uploaded files appear in list
- [ ] Shows file metadata (name, size, date)
- [ ] Toggle between Grid and List views
- [ ] Search for documents by name
- [ ] Search filters results in real-time

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 8: PDF Viewer
Open and view PDF files.

**What to Test:**
- [ ] Click document to open
- [ ] PDF renders correctly
- [ ] Zoom In/Out buttons work
- [ ] Zoom to 100% works
- [ ] Fit to page works
- [ ] Next/Previous page navigation
- [ ] Page number input works
- [ ] Rotate button (90° increments)
- [ ] Download button works

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 9: Converted Files Viewer
Open converted files (images/text that became PDFs).

**What to Test:**
- [ ] Open converted image file
- [ ] Displays as PDF correctly
- [ ] Open converted text file
- [ ] Text formatting preserved
- [ ] Zoom and navigation work

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 10: Browser Console
Check for errors during all operations.

**What to Test:**
- [ ] Open DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Upload files and watch for errors
- [ ] Check Network tab for failed requests
- [ ] Verify Supabase Storage requests succeed

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Overall Testing Summary

**Total Tests**: 10  
**Passed**: ___  
**Failed**: ___  
**Skipped**: ___  

**Critical Issues Found**:
_List any major bugs or problems_

**Minor Issues Found**:
_List any small bugs or UI issues_

**Overall Status**: [ ] ✅ READY FOR PRODUCTION | [ ] ❌ NEEDS FIXES

**Tested By**: _______________  
**Date**: _______________  
**Browser**: _______________
