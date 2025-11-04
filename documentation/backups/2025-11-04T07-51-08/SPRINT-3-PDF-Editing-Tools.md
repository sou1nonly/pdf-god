# Sprint 3: PDF Editing Tools

**Duration:** 2 weeks  
**Sprint Goal:** Implement core PDF editing capabilities including text editing, annotations, and drawing tools

---

## Sprint Planning

### User Stories

#### US-3.1: Text Editing Mode
**As a** user  
**I want** to edit text directly in PDFs  
**So that** I can correct errors and make changes

**Story Points:** 13  
**Priority:** Critical

**Acceptance Criteria:**
- [ ] Click on text to enter edit mode
- [ ] Text is editable inline
- [ ] Font, size, color can be changed
- [ ] Text alignment options (left, center, right, justify)
- [ ] Bold, italic, underline formatting
- [ ] Changes save to PDF

---

#### US-3.2: Annotation Tools
**As a** user  
**I want** to highlight and annotate PDFs  
**So that** I can mark important sections

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Highlight tool with color picker (8 colors)
- [ ] Underline and strikethrough tools
- [ ] Sticky note comments
- [ ] Text selection for annotations
- [ ] Annotation layer separate from content
- [ ] Export with/without annotations option

---

#### US-3.3: Drawing Tools
**As a** user  
**I want** to draw on PDFs  
**So that** I can add custom marks and diagrams

**Story Points:** 8  
**Priority:** High

**Acceptance Criteria:**
- [ ] Pen/brush tool with adjustable thickness
- [ ] Color picker for drawing
- [ ] Eraser tool
- [ ] Shape tools (rectangle, circle, arrow, line)
- [ ] Smooth drawing at 60 FPS
- [ ] Undo/redo for drawings

---

#### US-3.4: Image Insertion
**As a** user  
**I want** to insert images into PDFs  
**So that** I can add logos or visual elements

**Story Points:** 5  
**Priority:** Medium

**Acceptance Criteria:**
- [ ] Upload image (JPG, PNG, SVG)
- [ ] Drag to position image
- [ ] Resize image with handles
- [ ] Rotate image
- [ ] Delete image
- [ ] Image quality preserved

---

#### US-3.5: Undo/Redo System
**As a** user  
**I want** to undo and redo my actions  
**So that** I can correct mistakes

**Story Points:** 5  
**Priority:** High

**Acceptance Criteria:**
- [ ] Undo button (Ctrl+Z)
- [ ] Redo button (Ctrl+Y)
- [ ] 50-step history maintained
- [ ] Visual feedback for undo/redo
- [ ] History persists during session
- [ ] All edit operations undoable

---

## Sprint Backlog (Tasks)

### Text Editing (US-3.1)

**Task 3.1.1:** Research PDF text extraction with pdf-lib
```typescript
// server/src/services/pdfTextService.ts
import { PDFDocument } from 'pdf-lib';

export const extractTextBlocks = async (pdfBuffer: Buffer) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  // Extract text coordinates and content
  // Return structured text blocks with positions
};
```
- **Estimated:** 4 hours

**Task 3.1.2:** Integrate Fabric.js for canvas editing
```bash
npm install fabric
```
```tsx
// client/src/components/editor/EditableCanvas.tsx
import { Canvas } from 'fabric';

const canvas = new Canvas('canvas-id');
// Add text objects as Fabric text elements
```
- **Estimated:** 3 hours

**Task 3.1.3:** Create text selection and edit mode
```tsx
// When user clicks text:
// 1. Detect click coordinates
// 2. Find corresponding text block
// 3. Convert to editable Fabric Text object
// 4. Show text editing toolbar
```
- **Estimated:** 6 hours

**Task 3.1.4:** Build text formatting toolbar
```tsx
// client/src/components/editor/TextFormatToolbar.tsx
export const TextFormatToolbar = ({ selectedText, onUpdate }) => {
  return (
    <div className="toolbar">
      <select onChange={handleFontChange}>
        <option>Arial</option>
        <option>Times New Roman</option>
        <option>Helvetica</option>
      </select>
      
      <select onChange={handleSizeChange}>
        {[8, 10, 12, 14, 16, 18, 24, 36].map(size => (
          <option key={size}>{size}pt</option>
        ))}
      </select>
      
      <input type="color" onChange={handleColorChange} />
      
      <button onClick={() => applyFormat('bold')}>B</button>
      <button onClick={() => applyFormat('italic')}>I</button>
      <button onClick={() => applyFormat('underline')}>U</button>
      
      <button onClick={() => setAlignment('left')}>←</button>
      <button onClick={() => setAlignment('center')}>↔</button>
      <button onClick={() => setAlignment('right')}>→</button>
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 3.1.5:** Implement text save to PDF
```typescript
// server/src/services/pdfEditService.ts
export const applyTextEdits = async (
  pdfBuffer: Buffer,
  edits: TextEdit[]
) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  edits.forEach(edit => {
    // Remove old text
    // Draw new text with updated properties
  });
  
  return await pdfDoc.save();
};
```
- **Estimated:** 6 hours

**Task 3.1.6:** Add text add mode (insert new text)
```tsx
// Click anywhere on PDF to add new text box
const handleCanvasClick = (e) => {
  if (mode === 'add-text') {
    const text = new fabric.IText('Type here...', {
      left: e.offsetX,
      top: e.offsetY,
      fontSize: 14,
      fill: '#000000'
    });
    canvas.add(text);
  }
};
```
- **Estimated:** 3 hours

**Task 3.1.7:** Test and debug text editing
- Test various fonts
- Test special characters
- Test multi-line text
- Test text wrapping
- **Estimated:** 4 hours

---

### Annotations (US-3.2)

**Task 3.2.1:** Implement text selection
```tsx
// client/src/hooks/useTextSelection.ts
export const useTextSelection = () => {
  const [selection, setSelection] = useState(null);
  
  const handleMouseUp = () => {
    const selected = window.getSelection();
    if (selected.toString().length > 0) {
      const range = selected.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: selected.toString(),
        bounds: rect
      });
    }
  };
  
  return { selection, handleMouseUp };
};
```
- **Estimated:** 3 hours

**Task 3.2.2:** Create highlight tool
```tsx
// client/src/components/editor/HighlightTool.tsx
const applyHighlight = (selection, color) => {
  // Create semi-transparent rectangle over selected text
  const highlight = new fabric.Rect({
    left: selection.bounds.left,
    top: selection.bounds.top,
    width: selection.bounds.width,
    height: selection.bounds.height,
    fill: color,
    opacity: 0.3,
    selectable: true
  });
  
  canvas.add(highlight);
};
```
- **Estimated:** 4 hours

**Task 3.2.3:** Add color picker for annotations
```tsx
// client/src/components/editor/ColorPicker.tsx
const colors = [
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FF0000', // Red
  '#FFA500', // Orange
  '#0000FF', // Blue
  '#800080'  // Purple
];

export const ColorPicker = ({ onSelect }) => {
  return (
    <div className="color-picker-grid">
      {colors.map(color => (
        <div
          key={color}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
};
```
- **Estimated:** 2 hours

**Task 3.2.4:** Implement underline and strikethrough
```tsx
const applyUnderline = (selection) => {
  const line = new fabric.Line([
    selection.bounds.left,
    selection.bounds.bottom,
    selection.bounds.right,
    selection.bounds.bottom
  ], {
    stroke: '#000000',
    strokeWidth: 2
  });
  canvas.add(line);
};

const applyStrikethrough = (selection) => {
  const line = new fabric.Line([
    selection.bounds.left,
    selection.bounds.middle,
    selection.bounds.right,
    selection.bounds.middle
  ], {
    stroke: '#FF0000',
    strokeWidth: 2
  });
  canvas.add(line);
};
```
- **Estimated:** 3 hours

**Task 3.2.5:** Create sticky note comment system
```tsx
// client/src/components/editor/StickyNote.tsx
export const StickyNote = ({ x, y, onSave }) => {
  const [text, setText] = useState('');
  
  return (
    <div 
      className="sticky-note"
      style={{ position: 'absolute', left: x, top: y }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add comment..."
      />
      <button onClick={() => onSave(text)}>Save</button>
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 3.2.6:** Store annotations in database
```typescript
// server/src/models/Annotation.ts
const annotationSchema = new mongoose.Schema({
  document: { type: ObjectId, ref: 'Document' },
  page: Number,
  type: { type: String, enum: ['highlight', 'underline', 'strikethrough', 'comment'] },
  bounds: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  color: String,
  text: String, // For comments
  author: { type: ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
```
- **Estimated:** 2 hours

---

### Drawing Tools (US-3.3)

**Task 3.3.1:** Implement freehand drawing
```tsx
// client/src/components/editor/DrawingTool.tsx
export const DrawingTool = ({ canvas }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushWidth, setBrushWidth] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');
  
  canvas.isDrawingMode = true;
  canvas.freeDrawingBrush.width = brushWidth;
  canvas.freeDrawingBrush.color = brushColor;
  
  return (
    <div className="drawing-controls">
      <input
        type="range"
        min="1"
        max="20"
        value={brushWidth}
        onChange={(e) => setBrushWidth(Number(e.target.value))}
      />
      <input
        type="color"
        value={brushColor}
        onChange={(e) => setBrushColor(e.target.value)}
      />
    </div>
  );
};
```
- **Estimated:** 4 hours

**Task 3.3.2:** Add shape drawing tools
```tsx
// Rectangle
const drawRectangle = () => {
  let rect, isDown, origX, origY;
  
  canvas.on('mouse:down', (o) => {
    isDown = true;
    const pointer = canvas.getPointer(o.e);
    origX = pointer.x;
    origY = pointer.y;
    rect = new fabric.Rect({
      left: origX,
      top: origY,
      fill: '',
      stroke: brushColor,
      strokeWidth: 2
    });
    canvas.add(rect);
  });
  
  canvas.on('mouse:move', (o) => {
    if (!isDown) return;
    const pointer = canvas.getPointer(o.e);
    rect.set({
      width: Math.abs(pointer.x - origX),
      height: Math.abs(pointer.y - origY)
    });
    canvas.renderAll();
  });
  
  canvas.on('mouse:up', () => {
    isDown = false;
  });
};

// Similar implementations for Circle, Line, Arrow
```
- **Estimated:** 5 hours

**Task 3.3.3:** Implement eraser tool
```tsx
const enableEraser = () => {
  canvas.isDrawingMode = false;
  
  canvas.on('mouse:down', (options) => {
    if (options.target) {
      canvas.remove(options.target);
    }
  });
};
```
- **Estimated:** 2 hours

**Task 3.3.4:** Optimize drawing performance
```typescript
// Use requestAnimationFrame for smooth rendering
// Throttle mouse move events
// Simplify path data for complex drawings
```
- **Estimated:** 3 hours

**Task 3.3.5:** Add drawing layers system
```tsx
// Separate drawing layer from text/content
// Allow toggling layer visibility
// Export with/without drawings
```
- **Estimated:** 4 hours

---

### Image Insertion (US-3.4)

**Task 3.4.1:** Create image upload for insertion
```tsx
// client/src/components/editor/ImageInsert.tsx
export const ImageInsert = ({ canvas }) => {
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      fabric.Image.fromURL(event.target.result, (img) => {
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5
        });
        canvas.add(img);
      });
    };
    
    reader.readAsDataURL(file);
  };
  
  return (
    <input
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
    />
  );
};
```
- **Estimated:** 3 hours

**Task 3.4.2:** Add image manipulation controls
```tsx
// Resize handles (corner drag)
// Rotation handle
// Move image (drag)
// Delete button
// Bring to front/send to back
```
- **Estimated:** 3 hours

**Task 3.4.3:** Implement image quality preservation
```typescript
// When saving to PDF, embed high-resolution image
// Compress if necessary but maintain quality
```
- **Estimated:** 2 hours

---

### Undo/Redo System (US-3.5)

**Task 3.5.1:** Implement history manager
```typescript
// client/src/utils/historyManager.ts
export class HistoryManager {
  private history: any[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  
  push(state: any) {
    // Remove any future states if we're not at the end
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    this.history.push(state);
    
    // Keep history within limit
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }
  
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  canUndo() {
    return this.currentIndex > 0;
  }
  
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }
}
```
- **Estimated:** 3 hours

**Task 3.5.2:** Integrate with Fabric.js canvas
```tsx
const canvas = new fabric.Canvas('canvas');
const history = new HistoryManager();

// Save state after each modification
canvas.on('object:added', () => {
  history.push(canvas.toJSON());
});

canvas.on('object:modified', () => {
  history.push(canvas.toJSON());
});

canvas.on('object:removed', () => {
  history.push(canvas.toJSON());
});

// Undo/Redo handlers
const handleUndo = () => {
  const prevState = history.undo();
  if (prevState) {
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
    });
  }
};

const handleRedo = () => {
  const nextState = history.redo();
  if (nextState) {
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
    });
  }
};
```
- **Estimated:** 3 hours

**Task 3.5.3:** Add keyboard shortcuts
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```
- **Estimated:** 1 hour

**Task 3.5.4:** Add undo/redo UI buttons
```tsx
// Toolbar buttons with disabled states
<button
  onClick={handleUndo}
  disabled={!history.canUndo()}
  title="Undo (Ctrl+Z)"
>
  ↶
</button>

<button
  onClick={handleRedo}
  disabled={!history.canRedo()}
  title="Redo (Ctrl+Y)"
>
  ↷
</button>
```
- **Estimated:** 1 hour

---

## Definition of Done (DoD)

- [ ] All editing tools functional
- [ ] Smooth drawing performance (60 FPS)
- [ ] Changes persist when saved
- [ ] Undo/redo works for all operations
- [ ] Mobile touch support tested
- [ ] Memory usage optimized (no leaks)
- [ ] Cross-browser compatibility verified
- [ ] Keyboard shortcuts documented

---

## Sprint Ceremonies

### Daily Standup (15 min)
**Key Focus:** Fabric.js integration challenges, performance optimization

### Sprint Review (2 hours)
**Demo:**
- Edit text in a PDF
- Apply formatting (bold, color, size)
- Highlight text in different colors
- Draw freehand and shapes
- Add sticky note comments
- Insert and manipulate images
- Undo/redo all operations

### Sprint Retrospective (1.5 hours)
**Discuss:**
- Fabric.js learning curve
- Performance bottlenecks
- User experience improvements

---

## Technical Debt & Risks

**Risks:**
1. Fabric.js and PDF.js integration complexity
2. Canvas performance with many objects
3. Text extraction accuracy for complex PDFs
4. Mobile touch event handling

**Technical Debt:**
- Add object grouping (select multiple objects)
- Implement copy/paste functionality
- Add snap-to-grid for precise alignment
- Optimize canvas rendering (virtual scrolling for large docs)

---

## Sprint Velocity

**Estimated Story Points:** 39  
**Actual Story Points Completed:** _____  
**Velocity:** _____

---

## Testing Checklist

- [ ] Edit text in various fonts
- [ ] Apply formatting to selected text
- [ ] Highlight text across multiple lines
- [ ] Draw smooth curves at different speeds
- [ ] Draw all shapes (rectangle, circle, arrow, line)
- [ ] Erase specific drawings
- [ ] Insert image and resize
- [ ] Rotate image
- [ ] Undo 50 consecutive actions
- [ ] Redo after undo
- [ ] Test on tablet with stylus
- [ ] Test keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- [ ] Save and reload edited PDF

---

## Notes

- Fabric.js provides excellent canvas manipulation
- Consider using pdf-lib for final PDF generation with edits
- Performance is critical—profile frequently
- Keep edit history in memory (don't persist until save)
- Test with PDFs of varying complexity
