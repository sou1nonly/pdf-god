# Sprint 3 Testing Checklist

All tests for PDF editing tools, annotations, drawing, images, and undo/redo features.

---

## Test 1: Text Editing - Basic Text Addition
Add and edit text on PDF documents.

**What to Test:**
- [ .] Click "Text" tool in toolbar (Type icon)
- [ .] Tool button highlights (active state)
- [ .] Click anywhere on PDF canvas
- [ .] Text box appears with "Type here" placeholder
- [ .] Cursor blinks inside text box
- [ .] Type some text
- [ .] Text appears on PDF in real-time
- [ .] Click outside text box to deselect
- [ .] Click text again to edit

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 2: Text Editing - Font Formatting
Format text with different fonts and sizes.

**What to Test:**
- [ .] Select Text tool
- [ .] Font family dropdown appears in toolbar
- [ .] Change font to "Times New Roman"
- [ .] Add new text - verify font changed
- [ .] Change font size to 24
- [ .] Add new text - verify size changed
- [ .] Try all fonts: Arial, Georgia, Verdana, Helvetica, Courier New
- [ .] Font size range works: 8 to 72

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: the tests passed but here i'm unable to increase or decrease the size or font of text after i've written the text in textbox and even if its selected i've to select by default whatever i want.. i want to change it however i want while writing 

---

## Test 3: Text Editing - Bold & Italic
Apply bold and italic styling to text.

**What to Test:**
- [ .] Select Text tool
- [ .] Click Bold button (B icon)
- [ .] Bold button highlights
- [ .] Add text - verify it's bold
- [ .] Click Italic button (I icon)
- [ .] Italic button highlights
- [ .] Add text - verify it's bold AND italic
- [ .] Click Bold again to turn off
- [ .] Add text - verify only italic
- [ .] Turn off both - verify normal text

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: same with this the above issue i want to change or edit whatever text i'm writing
---

## Test 4: Text Editing - Color Picker
Change text color.

**What to Test:**
- [ ] Select Text tool
- [ ] Click color picker input (small square)
- [ ] Color picker dialog opens
- [ ] Select red color
- [ ] Add text - verify it's red
- [ ] Change to blue
- [ ] Add text - verify it's blue
- [ ] Try custom color (#00FF00 green)
- [ ] Verify custom colors work

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: working but same above issue_

---

## Test 5: Text Editing - Multiple Text Boxes
Add and manage multiple text elements.

**What to Test:**
- [ ] Add 5 different text boxes on PDF
- [ ] Each has different content
- [ ] Click any text box to select it
- [ ] Selection handles appear (8 corners/sides)
- [ ] Drag text box to move it
- [ ] Text moves smoothly
- [ ] Resize text box by dragging handles
- [ ] Text box resizes
- [ ] Click and drag to select text box
- [ ] Press Delete key - text box removed

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 6: Highlight Tool
Add highlight annotations to text.

**What to Test:**
- [ ] Click "Highlight" tool (Highlighter icon)
- [ ] Cursor changes to crosshair
- [ ] Click and drag across text area
- [ ] Yellow semi-transparent rectangle appears
- [ ] Release mouse - highlight stays
- [ ] Highlight is selectable and movable
- [ ] Resize highlight by dragging handles
- [ ] Create multiple highlights
- [ ] Delete highlight (select + Delete key)

**Status**: [yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 7: Stamp Tool
Add professional stamps to documents.

**What to Test:**
- [ ] Click "Stamp" tool (Stamp icon)
- [ ] Stamp dropdown and color picker appear in toolbar
- [ ] Select "APPROVED" from dropdown
- [ ] Click anywhere on PDF
- [ ] Red bordered stamp with "APPROVED" text appears
- [ ] Stamp is selectable and movable (drag)
- [ ] Try different stamps: DRAFT, CONFIDENTIAL, URGENT, REVIEWED, FINAL, COPY, VOID
- [ ] Each stamp displays correctly
- [ ] Change stamp color to blue
- [ ] Create stamp - verify blue color
- [ ] Change color to green
- [ ] Create stamp - verify green color
- [ ] Create 3-5 stamps in different locations with different texts
- [ ] Select stamp and press Delete
- [ ] Stamp is removed

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 8: Freehand Drawing Tool
Draw with pen/pencil tool.

**What to Test:**
- [ ] Click "Draw" tool (Pencil icon)
- [ ] Stroke width and color inputs appear
- [ ] Click and drag on PDF
- [ ] Black line follows cursor smoothly
- [ ] Release mouse - drawing stays
- [ ] Change stroke width to 5
- [ ] Draw again - line is thicker
- [ ] Change color to red
- [ ] Draw again - line is red
- [ ] Try stroke widths: 1, 5, 10, 20
- [ ] Drawings are permanent until deleted

**Status**: [yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 9: Shape Tools - Rectangle
Draw rectangles on PDF.

**What to Test:**
- [ ] Click "Rectangle" tool (Square icon)
- [ ] Stroke controls appear
- [ ] Click and drag on PDF
- [ ] Rectangle grows with drag
- [ ] Release mouse - rectangle stays
- [ ] Rectangle has transparent fill
- [ ] Rectangle has colored stroke
- [ ] Change stroke color to blue
- [ ] Draw rectangle - verify blue border
- [ ] Change stroke width to 8
- [ ] Draw rectangle - verify thick border
- [ ] Select and resize rectangle
- [ ] Aspect ratio not locked

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: add fill inside option too with colors for it too and also add option to change opacity of overall shape.. and let me edit all those things when after creating i'm edit
---

## Test 10: Shape Tools - Circle
Draw circles on PDF.

**What to Test:**
- [ ] Click "Circle" tool (Circle icon)
- [ ] Click and drag on PDF
- [ ] Circle grows from center
- [ ] Release mouse - circle stays
- [ ] Circle has transparent fill
- [ ] Circle has colored stroke
- [ ] Try different stroke widths
- [ ] Try different stroke colors
- [ ] Create perfect circle (equal width/height)
- [ ] Create oval by resizing

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: add fill inside option too with colors for it too and also add option to change opacity of overall shape.. and let me edit all those things when after creating i'm edit.... 
>>> also there's a bug the image gets inverted somestimes when i'm editing and i don't know whats causing it maybe refresing or something else maybe its also happeing with other tools fix it too
---

## Test 11: Shape Tools - Arrow & Line
Draw arrows and lines.

**What to Test:**
- [ ] Click "Arrow" tool (ArrowRight icon)
- [ ] Click and drag on PDF
- [ ] Line follows cursor
- [ ] Release mouse - line stays
- [ ] Click "Line" tool (Minus icon)
- [ ] Click and drag
- [ ] Straight line appears
- [ ] Change stroke color
- [ ] Lines use new color
- [ ] Change stroke width
- [ ] Lines use new width

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: arrow works same as the line tool
---

## Test 12: Eraser Tool
Erase parts of drawings.

**What to Test:**
- [ ] Draw some freehand lines
- [ ] Click "Eraser" tool (Eraser icon)
- [ ] Click and drag over drawings
- [ ] Drawing disappears where eraser touched
- [ ] Eraser width is 2x stroke width
- [ ] Change stroke width
- [ ] Eraser size changes accordingly
- [ ] Eraser only affects drawings (not PDF background)
- [ ] Try erasing text boxes (should not work - Delete key instead)

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: eraser is working but it also erases the pdf which is in the background check again how pdf is inserted into the canvas... i want option for erase to work only on drawings or pdf too and also add controls to increase opacity of how deep eraser erases and its size too

---

## Test 13: Image Insertion
Add images to PDF.

**What to Test:**
- [ ] Click "Image" tool (Image icon)
- [ ] File picker dialog opens immediately
- [ ] Cancel dialog - nothing happens
- [ ] Click Image tool again
- [ ] Select JPG image from computer
- [ ] Image appears on PDF at click location
- [ ] Image is at 50% scale
- [ ] Image has selection handles
- [ ] Drag image to move it
- [ ] Drag corner handles to resize
- [ ] Aspect ratio is maintained
- [ ] Try PNG, GIF, WebP images
- [ ] All image formats work

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: for image insertions change the current functionality... open the upload box when i select the image insertion tool and when i select a image paste it on the centre of the the page open and rest is the same as above for editing and all that
---

## Test 14: Undo/Redo - Basic Functionality
Test undo and redo buttons.

**What to Test:**
- [ ] Add a text box
- [ ] Undo button is enabled (not grayed out)
- [ ] Redo button is disabled
- [ ] Click Undo button
- [ ] Text box disappears
- [ ] Redo button is now enabled
- [ ] Click Redo button
- [ ] Text box reappears
- [ ] Repeat with drawings, shapes, images

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: its working but i think there's a refresh issue in the pdf area everytime i clicks a tool it refreshes make it more robust and less prone to bugs 

---

## Test 15: Undo/Redo - Keyboard Shortcuts
Test keyboard shortcuts for undo/redo.

**What to Test:**
- [ ] Add text box
- [ ] Press Ctrl+Z (or Cmd+Z on Mac)
- [ ] Text box is removed
- [ ] Press Ctrl+Y (or Cmd+Y on Mac)
- [ ] Text box reappears
- [ ] Add multiple elements (5+)
- [ ] Press Ctrl+Z multiple times
- [ ] Each action undoes in reverse order
- [ ] Press Ctrl+Y multiple times
- [ ] Each action redoes in original order

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: yes the same refresh thing 
---

## Test 16: Undo/Redo - History Limit
Test 50-step history buffer.

**What to Test:**
- [ ] Add 60 text boxes or drawings
- [ ] Try to undo all 60 actions
- [ ] Can only undo last 50 actions
- [ ] First 10 actions cannot be undone
- [ ] History buffer works as circular queue
- [ ] No memory issues or crashes

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: 

---

## Test 17: Undo/Redo - All Tool Types
Test undo/redo with every tool.

**What to Test:**
- [ ] Text: Add text, undo, redo ✓
- [ ] Highlight: Add highlight, undo, redo ✓
- [ ] Comment: Add comment, undo, redo ✓
- [ ] Draw: Draw line, undo, redo ✓
- [ ] Rectangle: Draw rect, undo, redo ✓
- [ ] Circle: Draw circle, undo, redo ✓
- [ ] Arrow: Draw arrow, undo, redo ✓
- [ ] Line: Draw line, undo, redo ✓
- [ ] Image: Insert image, undo, redo ✓
- [ ] Eraser: Erase drawing, undo (drawing returns), redo ✓

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: yes all but what is this strikethrough thing and does it even work how is it even

---

## Test 18: Object Selection & Manipulation
Select, move, resize, and delete objects.

**What to Test:**
- [ ] Add various objects (text, shapes, images)
- [ ] Click object to select it
- [ ] Blue selection border appears
- [ ] 8 resize handles visible (corners + sides)
- [ ] Drag object - it moves smoothly
- [ ] Drag corner handle - object resizes
- [ ] Drag side handle - object stretches
- [ ] Press Delete key - object removed
- [ ] Click empty space - selection cleared

**Status**: [yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: yes it works but some issues like somestimes i need to add something over some object at that time it doesnt work we can change controls like double click for selection and editing and single click for normal insertion and other things

---

## Test 19: Tool Switching
Switch between tools seamlessly.

**What to Test:**
- [ ] Select Text tool - cursor changes to text cursor
- [ ] Select Draw tool - cursor changes to crosshair
- [ ] Select Eraser tool - cursor changes
- [ ] Switch rapidly between tools
- [ ] No lag or errors
- [ ] Active tool always highlighted in toolbar
- [ ] Tool-specific controls appear/disappear correctly
- [ ] Font controls only show for Text tool
- [ ] Stroke controls only show for Drawing tools

**Status**: [ yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: it works fine but why does it refresh the whole screen its not good make it not do things like that it makes it look laggish and also do somethign about this strikethrough and arrow tool
---

## Test 20: PDF Background Integrity
Ensure PDF background is not affected by edits.

**What to Test:**
- [ ] Open a PDF with text and images
- [ ] Add text boxes over PDF content
- [ ] PDF background remains unchanged
- [ ] Add drawings over PDF
- [ ] PDF background visible through drawings
- [ ] Use eraser tool
- [ ] Eraser only affects added objects (not PDF)
- [ ] Zoom in/out
- [ ] PDF and edits scale together
- [ ] PDF quality unchanged

**Status**: [ ] ✅ PASS | [this one] ❌ FAIL  
**Notes**: this one fails eraser erases the pdf data in background and improve it to be bug free also make it work and let me able to select text from pdf and also edit and format it 

---

## Test 21: Performance Test
Test with many objects and large PDFs.

**What to Test:**
- [ ] Add 50+ text boxes
- [ ] Canvas remains responsive
- [ ] Add 50+ drawings/shapes
- [ ] No lag when moving objects
- [ ] Undo/redo with 50 objects
- [ ] Operations complete quickly (<1 second)
- [ ] Open large PDF (50+ pages)
- [ ] Editing still smooth
- [ ] No browser memory issues
- [ ] Check DevTools Console for errors

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: it works fine just optimise the canvas area to not refresh this much page literally refreshes and blinks each time i select something or do something do it in backend but not let it affect the frontend
---

## Test 22: Browser Console Check
Monitor for errors during editing.

**What to Test:**
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Use all editing tools
- [ ] No console errors appear
- [ ] Check Network tab
- [ ] PDF.js worker loads successfully
- [ ] Fabric.js loads without errors
- [ ] No 404 or CORS errors

**Status**: [yes ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: why are drawins overlaying over each other i don't understand the background is fixed which is my pdf but everything else including the erase and all other tools are just overlaying over each other like i erased a shape in half but when i select the shape it comes to front and eraser overlay goes to back solve this issue.. same with erase i though it was erasing but it was just overlaying erase over my pdf i dont want this i want erase to work like how i asked above based on selection
---

## Test 23: Multi-Page PDF Support
Test editing on different pages.

**What to Test:**
- [ ] Open multi-page PDF
- [ ] Add edits to page 1
- [ ] Navigate to page 2
- [ ] Page 1 edits disappear (page changed)
- [ ] Add edits to page 2
- [ ] Navigate back to page 1
- [ ] Page 1 edits are gone (canvas resets on page change)
- [ ] This is expected behavior (per-page editing not yet implemented)

**Status**: [ ] ✅ PASS | [ ] ❌ FAIL  
**Notes**: _____________________

---

## Test 24: Zoom & Rotation Compatibility
Test editing with zoom and rotation.

**What to Test:**
- [ ] Zoom to 150%
- [ ] Add text - text scales with zoom
- [ ] Add shapes - shapes scale correctly
- [ ] Zoom to 50%
- [ ] Existing objects scale down
- [ ] Add new objects - they scale correctly
- [ ] Rotate PDF 90 degrees
- [ ] Canvas rotates correctly
- [ ] Add objects after rotation
- [ ] Objects align with rotated PDF

**Status**: [ yes] ✅ PASS | [ ] ❌ FAIL  
**Notes**: shapes zoom fine but i don't have any option to zoom into the canvas i want that option too in the bottom right beside where page 1 of 1 etc is written
---

## Test 25: Edge Cases & Error Handling
Test unusual scenarios.

**What to Test:**
- [ ] Click Text tool but don't add text
- [ ] Switch to another tool - no errors
- [ ] Add text with 0 content (empty)
- [ ] Text box appears but invisible
- [ ] Add image but cancel file picker
- [ ] No errors, nothing added
- [ ] Spam-click undo button rapidly
- [ ] No crashes or errors
- [ ] Add object at edge of canvas
- [ ] Object partially visible
- [ ] Can still select and move it

**Status**: [ ] ✅ PASS | [ no] ❌ FAIL  
**Notes**: check these scenarios again and it fails cancel the text tool if i add no text
---

## Overall Testing Summary

**Total Tests**: 25  
**Passed**: ___  
**Failed**: ___  
**Skipped**: ___  

**Critical Issues Found**:
_List any major bugs or problems that prevent core functionality_

---

**Minor Issues Found**:
_List any small bugs, UI glitches, or improvements needed_

---

**Performance Notes**:
_Any lag, slowness, or performance concerns_

---

**Browser Compatibility** (test in multiple browsers):
- [ ] Chrome/Edge (Chromium): ___________
- [ ] Firefox: ___________
- [ ] Safari: ___________

---

**Overall Status**: [ ] ✅ READY FOR SPRINT 4 | [ ] ❌ NEEDS FIXES

**Tested By**: _______________  
**Date**: _______________  
**Browser Used**: _______________  
**OS**: _______________

---

## Notes for Developers

**What's Working Well**:
- 
- 
- 

**What Needs Improvement**:
- 
- 
- 

**Suggestions for Next Sprint**:
- 
- 
-
