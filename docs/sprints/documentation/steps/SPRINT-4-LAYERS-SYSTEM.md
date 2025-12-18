# Sprint 4: Advanced Layers & Image System

**Goal:** Implement a Photoshop/Canva-like layer system to manage annotations, text, and images, enabling granular editing and better organization.

## 1. Layer Architecture

### 1.1 Data Structure
We will introduce a `Layer` concept.
```typescript
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'text' | 'annotation' | 'image' | 'background';
  order: number; // Higher number = on top
}
```

### 1.2 Fabric.js Integration
- **Single Canvas Approach:** We will continue using a single Fabric canvas but manage the Z-index of objects logically.
- **Object Tagging:** Every Fabric object will have a `layerId` custom property.
- **Z-Index Management:**
  - When a layer is moved up/down, we re-sort the canvas objects:
    `canvas.getObjects().sort((a, b) => layerOrder[a.layerId] - layerOrder[b.layerId])`
  - Then call `canvas.renderAll()`.
- **Visibility:**
  - Toggling layer visibility iterates through objects with that `layerId` and sets `object.visible`.
- **Locking:**
  - Toggling layer lock sets `object.selectable`, `object.evented` to false.

## 2. Enhanced Eraser (Pixel/Vector Erasing)

### 2.1 EraserBrush (Fabric.js v6)
- Instead of deleting whole objects, we will use `fabric.EraserBrush`.
- This allows "erasing" parts of paths, images, and shapes by using global composite operations (destination-out).
- **Note:** This works best on a per-object basis or on the whole canvas. For a layer system, we need to ensure the eraser only affects objects on the *active layer*.
- **Implementation:**
  - `canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);`
  - `canvas.freeDrawingBrush.width = 10;`

## 3. Image Support

### 3.1 Image Layer
- New tool: **Insert Image**.
- Uploads an image -> Adds `fabric.Image` object.
- Assigns to the currently active layer (or creates a new "Image Layer").
- Features: Resize, Rotate, Opacity (already supported by Fabric).

## 4. UI Components

### 4.1 Layers Panel (Right Sidebar)
- List of layers.
- Drag-and-drop reordering (or Up/Down buttons).
- **Controls per layer:**
  - Eye icon (Show/Hide).
  - Lock icon (Lock/Unlock).
  - Rename (Double click).
  - Delete (Trash icon).
- **Active Layer Indicator:** Highlights which layer new drawings/objects will be added to.

## 5. Implementation Steps

1.  **State Management:** Create `useLayerStore` or add to `EditorPage` state.
2.  **UI:** Build `LayersPanel.tsx`.
3.  **Canvas Logic:** Update `DrawingCanvas.tsx` to:
    - Accept `activeLayerId`.
    - Tag new objects with `layerId`.
    - Expose methods to `sortObjects`, `toggleLayerVisibility`, `lockLayer`.
    - Implement `EraserBrush`.
4.  **Integration:** Connect UI to Canvas logic.
