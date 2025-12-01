# Sprint 3: Intelligent PDF Reconstruction & Canva-Style Editing

**Focus:** Transforming static PDFs into editable, web-native documents with a drag-and-drop "Canva-like" experience.

## 🚀 Core Concept
Instead of drawing on top of a static PDF image (Annotation), we will **deconstruct** the PDF into its raw building blocks (Text, Images, Tables) and **reconstruct** it as a fully editable web page. This allows for true reflow, styling, and "Canva-style" manipulation. Finally, we will "print" this web view back into a pristine PDF.

---

## 📋 Implementation Roadmap

### Phase 1: The Skeleton (Data Extraction)
**Goal:** Extract raw content without visual noise.
1.  **Clean Worker Setup:** Modify the hydration worker to stop generating background images and focus purely on extracting text/image data.
2.  **Structural Analysis:** Implement algorithms (XY-Cut) to group raw text lines into logical blocks (Paragraphs, Columns) based on geometry.
3.  **Vector Extraction:** Extract lines and rectangles to identify table borders and separators.

### Phase 2: The Brain (Semantic Analysis)
**Goal:** Turn "Text Blocks" into "Meaningful Elements".
1.  **Heuristic Classification:** Use font size, weight, and position to tag blocks as `Heading`, `Body`, `Caption`, etc.
2.  **AI Integration (Local):** Integrate a lightweight, local AI model (Transformers.js) to refine classification (e.g., detecting lists, code blocks, or subtle headers).
3.  **JSON Document Model:** Build a standardized JSON tree representing the document structure (The "DOM" of our editor).

### Phase 3: The Canvas (Canva-Style UI)
**Goal:** A beautiful, drag-and-drop editing experience.
1.  **Native Web Renderer:** Create a React component that renders the JSON model using standard HTML/CSS (Tailwind Typography).
2.  **Block Interaction:** Make every element (Text, Image) selectable, draggable, and resizable.
3.  **Floating Toolbar:** Implement a context-aware toolbar that appears when selecting a block (Change Font, Color, Alignment).
4.  **Layout Engine:** Allow users to drag blocks to new positions, with auto-snap and alignment guides.

### Phase 4: The Export (Web to PDF)
**Goal:** High-fidelity output.
1.  **PDF Generation:** Use `html2canvas` + `jspdf` to capture the edited web view and convert it back into a downloadable PDF.
2.  **Quality Control:** Ensure fonts, images, and layout are preserved in the final export.

---

## 🛠️ Task Assignment (Step-by-Step)

*   **Step 1: [COMPLETED]** Implement "Clean Extraction" in Web Worker (Remove background generation).
*   **Step 2: [COMPLETED]** Build the "JSON Document Builder" to structure raw text into blocks (XY-Cut Algorithm implemented).
*   **Step 3: [COMPLETED]** Create the "Native Document Renderer" to display blocks as HTML (Editable Text Blocks).
*   **Step 4: [COMPLETED]** Implement "Block Interactivity" (Selection, Hover states, Drag-and-Drop).
*   **Step 5: [COMPLETED]** Build the "Floating Formatting Toolbar".
*   **Step 6: [COMPLETED]** Implement "Drag-and-Drop" layout logic (Refinement: Snap-to-grid, Alignment guides).
*   **Step 7: [COMPLETED]** Integrate "Local AI" for smarter block classification.
*   **Step 8: [COMPLETED]** Implement "Export to PDF" functionality.
