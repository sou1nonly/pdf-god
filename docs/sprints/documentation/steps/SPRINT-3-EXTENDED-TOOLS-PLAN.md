# Sprint 3 Extended: Advanced PDF Tools Implementation Plan

**Goal:** Implement a professional suite of PDF annotation, signing, and navigation tools using Fabric.js.

---

## 1. Professional Annotation Tools

### 1.1 Freehand Highlighter
**Description:** A transparent marker brush that allows coloring over any content (text, images, whitespace) without snapping constraints.
**Implementation Strategy:**
- **Library:** Fabric.js `PencilBrush`.
- **Configuration:**
  - `brush.color`: Set to user selection (Yellow, Green, etc.) with alpha channel (e.g., `rgba(255, 255, 0, 0.5)`).
  - `brush.width`: Adjustable (default ~20px).
  - `canvas.isDrawingMode`: `true`.
  - **Layering:** Ensure highlighter strokes are rendered *behind* text if possible, or use `globalCompositeOperation = 'multiply'` (if supported by canvas context) to simulate ink absorption.

### 1.2 Text Callout
**Description:** A text box with an attached arrow line pointing to a specific area. The arrow should dynamically follow the text box.
**Implementation Strategy:**
- **Structure:** A custom Fabric `Group` containing:
  1. `Textbox` (The comment).
  2. `Rect` (Background for text, optional).
  3. `Path` or `Line` (The arrow pointer).
- **Behavior:**
  - On creation: User clicks point A (target) and drags to point B (text location).
  - On move: Listen to `object:moving` event. Update the arrow's "tail" coordinates to match the text box center, while keeping the "head" fixed on the target.

### 1.3 Squiggly Underline
**Description:** A wavy line used to denote typos or uncertainty.
**Implementation Strategy:**
- **Rendering:** Generate an SVG path string representing a sine wave.
  - Formula: `M x y Q cp1x cp1y, x2 y2 T x3 y3...`
- **Interaction:**
  - User selects text -> Calculate bounding box -> Generate wave path along the bottom edge.
  - Or Freehand: A custom `PatternBrush` in Fabric.js that draws a repeating wave image along the path.

### 1.4 Stamp Tool
**Description:** Pre-defined and dynamic stamps.
**Implementation Strategy:**
- **Standard Stamps:**
  - Pre-load SVG assets for "APPROVED", "DRAFT", "CONFIDENTIAL", "VOID".
  - Add to canvas as `fabric.Group` or `fabric.Image`.
- **Dynamic Stamps:**
  - Create a `fabric.Group` on the fly.
  - Content:
    - Border: `fabric.Rect` or `fabric.Circle` with thick stroke.
    - Text 1: "APPROVED BY [User]".
    - Text 2: Current Date/Time.
  - Flatten/Group them so they move as one unit.

---

## 2. Signatures & Forms

### 2.1 Signature Tool
**Description:** A dedicated modal or mode for adding signatures.
**Modes:**
1.  **Draw:**
    - High-resolution canvas (separate from main PDF canvas for capture).
    - `PencilBrush` with variable width (simulating pressure) or fixed thin pen style.
    - Convert drawing to SVG/Image -> Add to main PDF canvas.
2.  **Type:**
    - Input field.
    - Font selection: Load cursive fonts (e.g., 'Dancing Script', 'Great Vibes', 'Sacramento') via Google Fonts.
    - Render as `fabric.Text` with the chosen font.
3.  **Upload:**
    - File input (PNG/JPG).
    - Remove background (optional simple thresholding) -> Add to canvas.

### 2.2 Checkmark / Crossmark
**Description:** Quick "stamp-like" symbols.
**Implementation Strategy:**
- **Assets:** Simple SVG paths for `✓` and `✗`.
- **Interaction:** Click-to-place.
- **Properties:** Color (Green/Red default), Resizable.

---

## 3. Utility & Navigation

### 3.1 Hand / Pan Tool
**Description:** Grab and drag the canvas to navigate.
**Implementation Strategy:**
- **State:** `canvas.isDrawingMode = false`, `canvas.selection = false`.
- **Events:**
  - `mouse:down`: Set `isDragging = true`, record start `{x, y}`.
  - `mouse:move`: If dragging, calculate delta. Apply `canvas.relativePan(new fabric.Point(deltaX, deltaY))`.
  - `mouse:up`: Set `isDragging = false`.
- **Cursor:** Change CSS cursor to `grab` / `grabbing`.

### 3.2 Link Tool
**Description:** Create clickable areas that link to URLs.
**Implementation Strategy:**
- **Visual:** A semi-transparent `fabric.Rect` (e.g., light blue, 20% opacity).
- **Data:** Attach custom property `linkUrl` to the object.
- **Behavior:**
  - **Edit Mode:** Resizable, movable. Double-click to edit URL.
  - **View Mode:** `hoverCursor = 'pointer'`. On click -> `window.open(object.linkUrl)`.

---

## 4. Technical Dependencies
- **Fabric.js:** Core canvas engine. (Need to install: `npm install fabric`)
- **Google Fonts:** For signature fonts.
- **Lucide React:** For UI icons (Tool selection).

## 5. Implementation Phases
1.  **Setup:** Install Fabric.js, initialize canvas overlay on PDF pages.
2.  **Phase 1 (Drawing):** Highlighter, Squiggly Line, Check/Cross.
3.  **Phase 2 (Objects):** Stamps, Signatures (Draw/Type/Upload).
4.  **Phase 3 (Interactive):** Text Callout, Links, Hand Tool.
