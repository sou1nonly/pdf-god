import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { DrawingTool, Layer } from '../types';
import { toast } from "sonner";

// Access global fabric
declare const fabric: any;

// Type helpers for fabric objects
type FabricCanvas = any;
type FabricObject = any;
type FabricEvent = any;

interface LayerCanvasProps {
    layerId: string;
    width: number;
    height: number;
    scale: number;
    isActive: boolean;
    isVisible: boolean;
    isLocked: boolean;
    zIndex: number;
    activeTool: DrawingTool;
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    opacity: number;
    onObjectsChange?: (layerId: string, objects: any[]) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
    onSelectionChange?: (hasSelection: boolean) => void;
    onToolChange?: (tool: DrawingTool) => void;
    onTextEditingChange?: (isEditing: boolean, styles?: any) => void;
    initialObjects?: any[];
    deselectSignal?: number;
    signatureToInsert?: string | null;
    onSignatureInserted?: () => void;
    linkToApply?: { url: string } | null;
    onLinkApplied?: () => void;
}

export interface LayerCanvasRef {
    getObjects: () => any[];
    loadObjects: (objects: any[]) => void;
    clear: () => void;
    undo: () => void;
    redo: () => void;
    getCanvas: () => HTMLCanvasElement | null; // For export
    deleteSelected: () => void;
}

// Single Layer Canvas component - each layer is its own Fabric.js canvas
export const LayerCanvas = forwardRef<LayerCanvasRef, LayerCanvasProps>(({
    layerId,
    width,
    height,
    scale,
    isActive,
    isVisible,
    isLocked,
    zIndex,
    activeTool,
    strokeColor,
    strokeWidth,
    fillColor,
    opacity,
    onObjectsChange,
    onHistoryChange,
    onSelectionChange,
    onToolChange,
    onTextEditingChange,
    initialObjects,
    deselectSignal,
    signatureToInsert,
    onSignatureInserted,
    linkToApply,
    onLinkApplied,
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricCanvas | null>(null);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const currentShapeRef = useRef<FabricObject | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const isUndoRedoRef = useRef(false);
    const isCreatingTextRef = useRef(false); // Prevent deselect during text creation
    // Hand tool refs
    const isPanningRef = useRef(false);
    const lastPosXRef = useRef(0);
    const lastPosYRef = useRef(0);

    // Handle deselect signal (but not during text creation)
    useEffect(() => {
        if (deselectSignal && fabricRef.current && !isCreatingTextRef.current) {
            fabricRef.current.discardActiveObject();
            fabricRef.current.requestRenderAll();
            onSelectionChange?.(false);
        }
    }, [deselectSignal, onSelectionChange]);

    // Initialize Fabric.js canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: width * scale,
            height: height * scale,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: 'transparent',
        });

        fabricRef.current = canvas;

        // Save initial state
        historyRef.current = [JSON.stringify(canvas.toJSON())];
        historyIndexRef.current = 0;

        return () => {
            canvas.dispose();
            fabricRef.current = null;
        };
    }, []);

    // Update canvas size when scale changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        canvas.setDimensions({
            width: width * scale,
            height: height * scale,
        });

        // Fix: Use Zoom mechanism to scale drawing context properly
        canvas.setZoom(scale);

        // No need to manually scale objects if we use setZoom
        canvas.renderAll();
    }, [width, height, scale]);

    // Save state to history (debounced to prevent lag)
    const saveToHistoryTimeout = useRef<NodeJS.Timeout | null>(null);
    const saveToHistory = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas || isUndoRedoRef.current) return;

        // Debounce history saves to prevent performance issues
        if (saveToHistoryTimeout.current) {
            clearTimeout(saveToHistoryTimeout.current);
        }

        saveToHistoryTimeout.current = setTimeout(() => {
            const json = JSON.stringify(canvas.toJSON());

            // Remove future states if we're not at the end
            if (historyIndexRef.current < historyRef.current.length - 1) {
                historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
            }

            historyRef.current.push(json);
            historyIndexRef.current = historyRef.current.length - 1;

            // Limit history size
            if (historyRef.current.length > 50) {
                historyRef.current.shift();
                historyIndexRef.current--;
            }

            // Notify parent of history state
            onHistoryChange?.(
                historyIndexRef.current > 0,
                historyIndexRef.current < historyRef.current.length - 1
            );
        }, 150); // 150ms debounce
    }, [onHistoryChange]);

    const notifyObjectsChange = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas || !onObjectsChange) return;

        const objects = canvas.toJSON().objects || [];
        onObjectsChange(layerId, objects);
    }, [layerId, onObjectsChange]);

    // Handle Signature Insertion (Placed after helper functions)
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || !signatureToInsert) return;

        fabric.Image.fromURL(signatureToInsert, (img: any) => {
            // Center the signature
            const center = canvas.getCenter();
            img.set({
                left: center.left,
                top: center.top,
                scaleX: 0.5,
                scaleY: 0.5,
                cornerSize: 10,
                transparentCorners: false,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveToHistory();
            notifyObjectsChange();
            onSignatureInserted?.();
        });
    }, [isActive, signatureToInsert, onSignatureInserted, saveToHistory, notifyObjectsChange]);

    // Handle Link application
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || isLocked || !linkToApply) return;

        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            activeObj.set('data-link', linkToApply.url);
            (activeObj as any).linkUrl = linkToApply.url;

            if (activeObj.type === 'textbox' || activeObj.type === 'i-text') {
                // Visual cue could be added here
            }

            canvas.requestRenderAll();
            saveToHistory();
            notifyObjectsChange();
            toast.success("Link added");
        }

        onLinkApplied?.();
    }, [linkToApply, isActive, isLocked, saveToHistory, notifyObjectsChange, onLinkApplied]);

    // Handle Hand Tool Panning
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || isLocked) return;

        if (activeTool !== 'hand') {
            canvas.defaultCursor = 'default';
            return;
        }

        canvas.defaultCursor = 'grab';
        canvas.selection = false;

        const handleHandDown = (opt: FabricEvent) => {
            if (!opt.e) return;
            isPanningRef.current = true;
            lastPosXRef.current = opt.e.clientX;
            lastPosYRef.current = opt.e.clientY;
            canvas.setCursor('grabbing');
        };

        const handleHandMove = (opt: FabricEvent) => {
            if (!isPanningRef.current) return;
            const e = opt.e;
            const vpt = canvas.viewportTransform;
            if (vpt) {
                vpt[4] += e.clientX - lastPosXRef.current;
                vpt[5] += e.clientY - lastPosYRef.current;
                canvas.requestRenderAll();
                lastPosXRef.current = e.clientX;
                lastPosYRef.current = e.clientY;
            }
        };

        const handleHandUp = () => {
            isPanningRef.current = false;
            canvas.setCursor('grab');
        };

        canvas.on('mouse:down', handleHandDown);
        canvas.on('mouse:move', handleHandMove);
        canvas.on('mouse:up', handleHandUp);

        return () => {
            canvas.off('mouse:down', handleHandDown);
            canvas.off('mouse:move', handleHandMove);
            canvas.off('mouse:up', handleHandUp);
        };
    }, [isActive, isLocked, activeTool]);

    // Handle double click to edit grouped notes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const handleDblClick = (opt: any) => {
            const target = opt.target;
            if (!target || !target.isNoteGroup) return;

            const group = target;
            // Get objects from group
            // note: getObjects() returns reference to objects in group.
            const items = group.getObjects();
            const textObj = items.find((i: any) => i.isNoteText);
            const bgObj = items.find((i: any) => i.isNoteBackground);

            if (!textObj || !bgObj) return;

            // Ungroup to allow editing
            // toActiveSelection removes group, adds items to canvas, selects them
            group.toActiveSelection();
            canvas.discardActiveObject(); // Deselect all

            // Select and edit text
            canvas.setActiveObject(textObj);
            textObj.enterEditing();
            textObj.selectAll();
            onTextEditingChange?.(false); // Disable text toolbar for notes

            // Auto-shrink text to fit container
            const handleTextChanged = () => {
                // Check if text height exceeds background height (with padding)
                const maxHeight = bgObj.height - 24; // 12px padding top/bottom
                if (textObj.height > maxHeight) {
                    const currentSize = textObj.fontSize || 14;
                    const newSize = Math.max(8, currentSize * 0.95); // Min 8px, shrink by 5%

                    if (currentSize > 8) {
                        textObj.set('fontSize', newSize);
                        // Force recalculation
                        textObj.initDimensions();
                        canvas.renderAll();

                        // Recursively check if it still overflows
                        if (textObj.height > maxHeight) {
                            handleTextChanged();
                        }
                    }
                }
            };

            textObj.on('changed', handleTextChanged);

            // Regroup after editing
            const handleEditExit = () => {
                // cleanup listeners
                textObj.off('editing:exited', handleEditExit);
                textObj.off('changed', handleTextChanged);

                // Check if objects still exist on canvas
                // Note: canvas.contains might check if object is in _objects array
                if (!canvas.contains(textObj) || !canvas.contains(bgObj)) return;

                // Create new group with current states
                const newGroup = new fabric.Group([bgObj, textObj], {
                    selectable: true,
                    evented: true,
                    isNoteGroup: true,
                    noteId: group.noteId,
                    subTargetCheck: true,
                    shadow: new fabric.Shadow({
                        color: 'rgba(0,0,0,0.15)',
                        blur: 8,
                        offsetX: 2,
                        offsetY: 2,
                    }),
                });

                canvas.remove(bgObj);
                canvas.remove(textObj);
                canvas.add(newGroup);
                canvas.setActiveObject(newGroup);
                canvas.renderAll();

                saveToHistory();
                notifyObjectsChange();
            };

            textObj.on('editing:exited', handleEditExit);
        };

        canvas.on('mouse:dblclick', handleDblClick);
        return () => {
            canvas.off('mouse:dblclick', handleDblClick);
        };
    }, [saveToHistory, notifyObjectsChange, onTextEditingChange]);

    // Handle tool changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // Always disable drawing mode first
        canvas.isDrawingMode = false;

        if (!isActive) {
            // Not the active layer: disable selection and clear any existing selection
            canvas.discardActiveObject(); // Clear selection when switching away
            canvas.selection = false;
            canvas.forEachObject((obj: FabricObject) => {
                obj.selectable = false;
                obj.evented = false;
            });
            canvas.renderAll();
            onSelectionChange?.(false); // Notify parent that selection is cleared
            return;
        }

        if (isLocked) {
            // Locked layer: disable all interaction
            canvas.selection = false;
            canvas.forEachObject((obj: FabricObject) => {
                obj.selectable = false;
                obj.evented = false;
            });
            return;
        }

        // Active and unlocked layer
        switch (activeTool) {
            case 'select':
                // SELECT: Click to select objects, drag to move them, resize handles appear
                // Double-click on text to edit
                canvas.selection = true;
                canvas.skipTargetFind = false; // Allow interaction
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = true;
                    obj.evented = true;
                    obj.hasControls = true;
                    obj.hasBorders = true;
                    // Ensure IText objects are editable
                    if (obj.type === 'i-text' || obj.type === 'textbox') {
                        obj.editable = true;
                    }
                });
                break;

            case 'hand':
                // HAND/PAN: For panning the view - objects not selectable
                canvas.selection = false;
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                break;

            case 'draw':
            case 'signature':
                // DRAW/PENCIL: Free-hand drawing with pencil brush
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = strokeColor;
                canvas.freeDrawingBrush.width = strokeWidth;
                break;

            case 'eraser':
                // ERASER: Removes objects on click/drag - handled by separate useEffect
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                break;

            case 'highlight':
                // HIGHLIGHT: Free-hand drawing with thick yellow semi-transparent brush
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)'; // Yellow with 40% opacity
                canvas.freeDrawingBrush.width = 20 * scale; // Thick brush for highlighting
                break;

            case 'text':
            case 'rect':
            case 'circle':
            case 'line':
            case 'arrow':
            case 'note':
            case 'callout':
            case 'image':
            case 'squiggly':
                // Shape tools: disable selection while drawing
                canvas.selection = false;
                canvas.skipTargetFind = true; // CRITICAL: Disable object interaction
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                break;

            case 'check':
            case 'cross':
            case 'stamp-approved':
            case 'stamp-draft':
            case 'stamp-confidential':
                // Stamp tools: click to place
                canvas.selection = false;
                canvas.skipTargetFind = true; // CRITICAL: Disable object interaction
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                break;

            default:
                canvas.selection = true;
                canvas.forEachObject((obj: FabricObject) => {
                    obj.selectable = true;
                    obj.evented = true;
                });
        }

        canvas.renderAll();
    }, [isActive, isLocked, activeTool, strokeColor, strokeWidth]);

    // Handle double-click to edit text objects in select mode
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || isLocked || activeTool !== 'select') return;

        const handleDoubleClick = (opt: FabricEvent) => {
            const target = opt.target;
            if (!target) return;

            // Check if it's an editable text object
            if (target.type === 'i-text' || target.type === 'textbox') {
                canvas.setActiveObject(target);
                target.enterEditing();
                // Position cursor at click location if possible
                if (opt.pointer && target.setSelectionStart) {
                    const clickPos = target.getSelectionStartFromPointer(opt.e);
                    if (clickPos !== undefined) {
                        target.setSelectionStart(clickPos);
                        target.setSelectionEnd(clickPos);
                    }
                }
                canvas.renderAll();
            }
        };

        canvas.on('mouse:dblclick', handleDoubleClick);

        return () => {
            canvas.off('mouse:dblclick', handleDoubleClick);
        };
    }, [isActive, isLocked, activeTool]);

    // Update brush properties when they change
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !canvas.freeDrawingBrush) return;

        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
        // Apply opacity by modifying the color with alpha
        // Convert hex to rgba with opacity
        const hex = strokeColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }, [strokeColor, strokeWidth, opacity]);

    // Track previous property values to detect user-initiated changes
    const prevPropsRef = useRef({ strokeColor, fillColor, strokeWidth, opacity });

    // Property Editing Effect - ONLY apply when user explicitly changes a property
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || activeTool !== 'select') return;

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length === 0) return;

        const prevProps = prevPropsRef.current;

        // Check what actually changed - only apply properties that USER changed
        const strokeColorChanged = prevProps.strokeColor !== strokeColor;
        const fillColorChanged = prevProps.fillColor !== fillColor;
        const strokeWidthChanged = prevProps.strokeWidth !== strokeWidth;
        const opacityChanged = prevProps.opacity !== opacity;

        // If nothing changed, user just selected something - don't auto-apply
        if (!strokeColorChanged && !fillColorChanged && !strokeWidthChanged && !opacityChanged) {
            return;
        }

        let hasChanges = false;
        activeObjects.forEach((obj: FabricObject) => {
            // SPECIAL HANDLING FOR NOTES
            if ((obj as any).isNoteGroup) {
                const group = obj as any;
                const items = group.getObjects();
                const bg = items.find((i: any) => i.isNoteBackground);
                const textObj = items.find((i: any) => i.isNoteText);

                if (strokeColorChanged && bg) {
                    bg.set('stroke', strokeColor);
                    if (textObj) textObj.set('fill', strokeColor); // Sync text to outline
                    hasChanges = true;
                }
                if (fillColorChanged && bg) {
                    const newFill = fillColor === 'transparent' ? '' : fillColor;
                    bg.set('fill', newFill);
                    hasChanges = true;
                }
                // Don't modify the group itself with these props (or at least stroke/fill)
                return;
            }

            // Only apply properties that USER explicitly changed
            if (strokeColorChanged && obj.stroke !== undefined) {
                obj.set('stroke', strokeColor);
                hasChanges = true;
            }
            if (fillColorChanged && obj.fill !== undefined && obj.type !== 'i-text' && obj.type !== 'textbox' && obj.type !== 'text') {
                const newFill = fillColor === 'transparent' ? '' : fillColor;
                obj.set('fill', newFill);
                hasChanges = true;
            }
            if (strokeWidthChanged && obj.strokeWidth !== undefined) {
                obj.set('strokeWidth', strokeWidth);
                hasChanges = true;
            }
            if (opacityChanged && obj.opacity !== undefined) {
                obj.set('opacity', opacity);
                hasChanges = true;
            }
        });

        // Update refs for next comparison
        prevPropsRef.current = { strokeColor, fillColor, strokeWidth, opacity };

        if (hasChanges) {
            canvas.renderAll();
            saveToHistory();
            notifyObjectsChange();
        }
    }, [isActive, activeTool, strokeColor, fillColor, strokeWidth, opacity, saveToHistory, notifyObjectsChange]);

    // Handle object modifications
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const handleModified = () => {
            saveToHistory();
            notifyObjectsChange();
        };

        const handlePathCreated = () => {
            saveToHistory();
            notifyObjectsChange();
        };

        const handleTextEditingExited = () => {
            // Save state when text editing is finished
            saveToHistory();
            notifyObjectsChange();
        };

        canvas.on('object:modified', handleModified);
        canvas.on('path:created', handlePathCreated);
        canvas.on('object:added', handleModified);
        canvas.on('object:removed', handleModified);
        canvas.on('text:editing:exited', handleTextEditingExited);

        return () => {
            canvas.off('object:modified', handleModified);
            canvas.off('path:created', handlePathCreated);
            canvas.off('object:added', handleModified);
            canvas.off('object:removed', handleModified);
            canvas.off('text:editing:exited', handleTextEditingExited);
        };
    }, [saveToHistory, notifyObjectsChange]);

    // Track selection changes to show/hide color panel
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive) return;

        const handleSelectionCreated = () => {
            onSelectionChange?.(true);
        };

        const handleSelectionUpdated = () => {
            onSelectionChange?.(true);
        };

        const handleSelectionCleared = () => {
            // IGNORE if we are in the middle of creating text
            // This prevents the parent from thinking we're done editing just because we switched active objects
            if (isCreatingTextRef.current) return;

            onSelectionChange?.(false);
            onTextEditingChange?.(false); // Also clear text editing when selection is cleared
        };

        // Track text editing state for IText objects
        const handleTextEditingEntered = (e: any) => {
            const textObj = e.target;
            if (textObj && !textObj.isNoteText) {
                // Use custom ID or fallback
                const id = textObj.id || `text-${Date.now()}`;

                // @ts-ignore - Pass 3 args (isEditing, blockId, styles)
                onTextEditingChange?.(true, id, {
                    fontFamily: textObj.fontFamily || 'Inter, sans-serif',
                    fontSize: textObj.fontSize || 16,
                    fontWeight: textObj.fontWeight || 400,
                    italic: textObj.fontStyle === 'italic',
                    underline: textObj.underline || false,
                    align: textObj.textAlign || 'left',
                    color: textObj.fill || '#000000',
                });
            }
        };

        const handleTextEditingExited = () => {
            onTextEditingChange?.(false);
        };

        canvas.on('selection:created', handleSelectionCreated);
        canvas.on('selection:updated', handleSelectionUpdated);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('text:editing:entered', handleTextEditingEntered);
        canvas.on('text:editing:exited', handleTextEditingExited);

        return () => {
            canvas.off('selection:created', handleSelectionCreated);
            canvas.off('selection:updated', handleSelectionUpdated);
            canvas.off('selection:cleared', handleSelectionCleared);
            canvas.off('text:editing:entered', handleTextEditingEntered);
            canvas.off('text:editing:exited', handleTextEditingExited);
        };
    }, [isActive, onSelectionChange, onTextEditingChange]);

    // Eraser tool - delete objects under cursor while mouse is down
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || isLocked || activeTool !== 'eraser') return;

        let isErasing = false;
        const eraserRadius = strokeWidth * 3; // Eraser size based on stroke width

        const getObjectsAtPoint = (x: number, y: number) => {
            const objects = canvas.getObjects();
            return objects.filter((obj: FabricObject) => {
                if (!obj.containsPoint) {
                    // For objects without containsPoint, check bounding box
                    const bound = obj.getBoundingRect();
                    return x >= bound.left && x <= bound.left + bound.width &&
                        y >= bound.top && y <= bound.top + bound.height;
                }
                return obj.containsPoint({ x, y });
            });
        };

        const eraseAtPoint = (x: number, y: number) => {
            // Check objects in a radius around the point
            const objects = canvas.getObjects();
            const toRemove: FabricObject[] = [];

            objects.forEach((obj: FabricObject) => {
                const bound = obj.getBoundingRect();
                const centerX = bound.left + bound.width / 2;
                const centerY = bound.top + bound.height / 2;

                // Check if any part of object is within eraser radius
                const objLeft = bound.left;
                const objRight = bound.left + bound.width;
                const objTop = bound.top;
                const objBottom = bound.top + bound.height;

                // Check if eraser circle intersects with object bounds
                const closestX = Math.max(objLeft, Math.min(x, objRight));
                const closestY = Math.max(objTop, Math.min(y, objBottom));
                const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

                if (distance <= eraserRadius) {
                    toRemove.push(obj);
                }
            });

            if (toRemove.length > 0) {
                toRemove.forEach((obj: FabricObject) => canvas.remove(obj));
                canvas.renderAll();
                saveToHistory();
                notifyObjectsChange();
            }
        };

        const handleMouseDown = (opt: FabricEvent) => {
            if (!opt.pointer) return;
            isErasing = true;
            eraseAtPoint(opt.pointer.x, opt.pointer.y);
        };

        const handleMouseMove = (opt: FabricEvent) => {
            if (!isErasing || !opt.pointer) return;
            eraseAtPoint(opt.pointer.x, opt.pointer.y);
        };

        const handleMouseUp = () => {
            isErasing = false;
        };

        // Disable default drawing mode for eraser
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.forEachObject((obj: FabricObject) => {
            obj.selectable = false;
            obj.evented = false;
        });

        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
        };
    }, [isActive, isLocked, activeTool, strokeWidth, saveToHistory, notifyObjectsChange]);


    // Mouse handlers for all shape/annotation tools
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive || isLocked) return;

        // Tools that need custom mouse handling (text is now handled by HydratedPageView for PDF text blocks, but we need it here for Annotation layer text)
        const shapeTools = ['rect', 'circle', 'line', 'arrow', 'note', 'callout', 'check', 'cross', 'squiggly', 'image', 'stamp-approved', 'stamp-draft', 'stamp-confidential', 'text'];

        if (!shapeTools.includes(activeTool)) {
            return;
        }

        const handleMouseDown = (opt: FabricEvent) => {
            // CRITICAL: Use getPointer for canvas-relative coordinates
            // This fixes the offset issue where drawings appear shifted
            const pointer = canvas.getPointer(opt.e);
            const x = pointer.x;
            const y = pointer.y;

            // For drawing tools, ignore clicks on existing objects
            if (opt.target && shapeTools.includes(activeTool)) {
                return;
            }

            // For click-to-place tools (stamps, checks, notes, image, callout, link)
            if (['check', 'cross', 'note', 'callout', 'link', 'stamp-approved', 'stamp-draft', 'stamp-confidential', 'image'].includes(activeTool)) {
                let obj: FabricObject;

                switch (activeTool) {
                    case 'check': {
                        // GREEN CHECKMARK - click to place
                        obj = new fabric.Text('✓', {
                            left: x - 10,
                            top: y - 12,
                            fontSize: 24 * scale,
                            fill: '#22c55e', // Green
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 'bold',
                            selectable: true,
                            evented: true,
                        });
                        break;
                    }

                    case 'cross': {
                        // RED X MARK - click to place
                        obj = new fabric.Text('✗', {
                            left: x - 10,
                            top: y - 12,
                            fontSize: 24 * scale,
                            fill: '#ef4444', // Red
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 'bold',
                            selectable: true,
                            evented: true,
                        });
                        break;
                    }

                    case 'note': {
                        // STICKY NOTE - Grouped for unified movement
                        const noteId = `note-${Date.now()}`;
                        const noteWidth = 150 * scale;
                        const noteHeight = 100 * scale;

                        // Use fillColor for background, strokeColor for outline and text
                        const noteBgColor = fillColor === 'transparent' ? '#fef3c7' : fillColor;
                        const noteStrokeColor = strokeColor || '#f59e0b';

                        // Background rect
                        const bg = new fabric.Rect({
                            left: x,
                            top: y,
                            width: noteWidth,
                            height: noteHeight,
                            fill: noteBgColor, // Use fillColor for background
                            stroke: noteStrokeColor, // Use strokeColor for outline
                            strokeWidth: 1,
                            rx: 4,
                            ry: 4,
                            noteId: noteId,
                            isNoteBackground: true,
                        });

                        // Editable text - uses strokeColor
                        const noteText = new fabric.Textbox('Note...', {
                            left: x + 8,
                            top: y + 8,
                            fontSize: 14 * scale,
                            fill: noteStrokeColor, // Use strokeColor for text
                            fontFamily: 'Inter, sans-serif',
                            width: noteWidth - 16,
                            noteId: noteId,
                            isNoteText: true,
                            editable: true,
                            splitByGrapheme: true,
                        });

                        const group = new fabric.Group([bg, noteText], {
                            left: x,
                            top: y,
                            selectable: true,
                            evented: true,
                            isNoteGroup: true,
                            noteId: noteId,
                            subTargetCheck: true,
                            opacity: 1,
                            shadow: new fabric.Shadow({
                                color: 'rgba(0,0,0,0.15)',
                                blur: 8,
                                offsetX: 2,
                                offsetY: 2,
                            }),
                        });

                        canvas.add(group);
                        canvas.setActiveObject(group);
                        onSelectionChange?.(true);

                        canvas.renderAll();
                        saveToHistory();
                        notifyObjectsChange();
                        onToolChange?.('select');
                        return;
                    }

                    case 'callout': {
                        // SPEECH BUBBLE/CALLOUT - Independent Components
                        const bubbleId = `callout-${Date.now()}`;
                        const bWidth = 140 * scale;
                        const bHeight = 80 * scale;

                        // Box + Text Group
                        const bubbleBox = new fabric.Rect({
                            width: bWidth,
                            height: bHeight,
                            fill: '#e0f2fe', // Light Blue
                            stroke: '#0ea5e9',
                            strokeWidth: 2,
                            rx: 16,
                            ry: 16,
                        });

                        const bubbleText = new fabric.Textbox('Comment', {
                            left: 12 * scale,
                            top: 12 * scale,
                            width: bWidth - 24 * scale,
                            fontSize: 14 * scale,
                            fill: '#0369a1',
                            fontFamily: 'Inter, sans-serif',
                            splitByGrapheme: true,
                        });

                        const boxGroup = new fabric.Group([bubbleBox, bubbleText], {
                            left: x,
                            top: y,
                            noteId: bubbleId,
                            isCalloutBox: true,
                            subTargetCheck: true,
                        });

                        // Independent Arrow (Line + Triangle Head)
                        const arrowStart = { x: 0, y: 0 };
                        const arrowEnd = { x: 40 * scale, y: 20 * scale };

                        const arrowLine = new fabric.Line([arrowStart.x, arrowStart.y, arrowEnd.x, arrowEnd.y], {
                            stroke: '#0ea5e9',
                            strokeWidth: 2,
                            originX: 'center',
                            originY: 'center'
                        });

                        const arrowHead = new fabric.Triangle({
                            width: 15 * scale,
                            height: 15 * scale,
                            fill: '#0ea5e9',
                            left: arrowEnd.x,
                            top: arrowEnd.y,
                            angle: 90,
                            originX: 'center',
                            originY: 'center'
                        });

                        const arrowGroup = new fabric.Group([arrowLine, arrowHead], {
                            left: x + bWidth,
                            top: y + bHeight / 2,
                            isCalloutArrow: true,
                        });

                        canvas.add(boxGroup);
                        canvas.add(arrowGroup);
                        canvas.setActiveObject(boxGroup);
                        canvas.renderAll();

                        saveToHistory();
                        notifyObjectsChange();

                        onToolChange?.('select');
                        return;
                    }

                    case 'link': {
                        // Link handled via selection action
                        break;
                    }

                    case 'stamp-approved': {
                        obj = new fabric.Text('APPROVED', {
                            left: x,
                            top: y,
                            fontSize: 20 * scale,
                            fill: '#22c55e',
                            fontFamily: 'Arial Black, sans-serif',
                            fontWeight: 'bold',
                            stroke: '#22c55e',
                            strokeWidth: 1,
                            angle: -15,
                            selectable: true,
                            evented: true,
                        });
                        break;
                    }

                    case 'stamp-draft': {
                        obj = new fabric.Text('DRAFT', {
                            left: x,
                            top: y,
                            fontSize: 20 * scale,
                            fill: '#f59e0b',
                            fontFamily: 'Arial Black, sans-serif',
                            fontWeight: 'bold',
                            stroke: '#f59e0b',
                            strokeWidth: 1,
                            angle: -15,
                            selectable: true,
                            evented: true,
                        });
                        break;
                    }

                    case 'stamp-confidential': {
                        obj = new fabric.Text('CONFIDENTIAL', {
                            left: x,
                            top: y,
                            fontSize: 18 * scale,
                            fill: '#ef4444',
                            fontFamily: 'Arial Black, sans-serif',
                            fontWeight: 'bold',
                            stroke: '#ef4444',
                            strokeWidth: 1,
                            angle: -15,
                            selectable: true,
                            evented: true,
                        });
                        break;
                    }

                    case 'image': {
                        // IMAGE TOOL - Open file picker and insert image at click position
                        // Create input element appended to body to ensure it works reliably
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.style.display = 'none';
                        document.body.appendChild(input);

                        input.onchange = (e: Event) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (!file) {
                                document.body.removeChild(input);
                                return;
                            }

                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const imgObj = new Image();
                                imgObj.src = event.target?.result as string;
                                imgObj.onload = () => {
                                    fabric.Image.fromObject(imgObj, (img: FabricObject) => {
                                        // Scale image to reasonable size (max 50% of canvas)
                                        const maxSize = Math.min(width, height) * 0.5 * scale;
                                        const imgScale = Math.min(maxSize / img.width, maxSize / img.height, 1);

                                        img.set({
                                            left: x - (img.width * imgScale / 2),
                                            top: y - (img.height * imgScale / 2),
                                            scaleX: imgScale,
                                            scaleY: imgScale,
                                            selectable: true,
                                            evented: true,
                                        });

                                        canvas.add(img);
                                        canvas.setActiveObject(img);
                                        canvas.renderAll();
                                        saveToHistory();
                                        notifyObjectsChange();
                                        onSelectionChange?.(true);
                                        onToolChange?.('select'); // Switch to select tool
                                        document.body.removeChild(input);
                                    });
                                }
                            };
                            reader.readAsDataURL(file);
                        };

                        // Handle cancel/close? Hard to detect, but removing on next click or timeout is tricky 
                        // Ideally we remove it after some time if not used, but onChange is best trigger

                        input.click();
                        return; // Don't fall through
                    }

                    default:
                        return;
                }

                canvas.add(obj);
                canvas.setActiveObject(obj); // Auto-select the created object
                canvas.renderAll();
                saveToHistory();
                notifyObjectsChange();
                onSelectionChange?.(true);
                onToolChange?.('select'); // Switch to select tool
                return;
            }

            // For drag-to-draw tools
            isDrawingRef.current = true;
            startPointRef.current = { x, y };

            switch (activeTool) {
                case 'text': {
                    // TEXT TOOL - click to place editable text
                    // Set flag to prevent deselect during creation
                    isCreatingTextRef.current = true;

                    const textId = `text-${Date.now()}`;
                    const text = new fabric.IText('Type here...', {
                        left: x,
                        top: y,
                        fontSize: 16 * scale,
                        fill: strokeColor,
                        fontFamily: 'Inter, sans-serif',
                        editable: true,
                        selectable: true,
                        evented: true,
                        // @ts-ignore - custom property
                        id: textId,
                    });

                    canvas.add(text);

                    // Activate and edit synchronously
                    canvas.setActiveObject(text);
                    text.enterEditing();
                    text.selectAll();

                    // Clear flag immediately after setup
                    isCreatingTextRef.current = false;
                    currentShapeRef.current = text;
                    isDrawingRef.current = false;

                    saveToHistory();
                    notifyObjectsChange();
                    onSelectionChange?.(true);

                    // Pass correct arguments: isEditing, blockId, styles
                    // Use @ts-ignore if types are strict about arguments count
                    // @ts-ignore
                    onTextEditingChange?.(true, textId, {
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 16,
                        fontWeight: 400,
                        italic: false,
                        underline: false,
                        align: 'left',
                        color: strokeColor,
                    });
                    break;
                }

                case 'rect': {
                    // RECTANGLE - drag to draw
                    const rect = new fabric.Rect({
                        left: x,
                        top: y,
                        width: 0,
                        height: 0,
                        fill: fillColor,
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        selectable: true,
                        evented: true,
                    });
                    canvas.add(rect);
                    currentShapeRef.current = rect;
                    break;
                }

                case 'circle': {
                    // CIRCLE - drag to draw
                    const circle = new fabric.Circle({
                        left: x,
                        top: y,
                        radius: 0,
                        fill: fillColor,
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        selectable: true,
                        evented: true,
                    });
                    canvas.add(circle);
                    currentShapeRef.current = circle;
                    break;
                }

                case 'line': {
                    // LINE - drag to draw
                    const line = new fabric.Line([x, y, x, y], {
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        selectable: true,
                        evented: true,
                    });
                    canvas.add(line);
                    currentShapeRef.current = line;
                    break;
                }

                case 'arrow': {
                    // ARROW - drag to draw
                    const arrowLine = new fabric.Line([x, y, x, y], {
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        originX: 'center',
                        originY: 'center',
                    });

                    const arrowHead = new fabric.Triangle({
                        width: 10 * scale,
                        height: 10 * scale,
                        fill: strokeColor,
                        left: x,
                        top: y,
                        angle: 90,
                        originX: 'center',
                        originY: 'center',
                    });

                    const arrow = new fabric.Group([arrowLine, arrowHead], {
                        left: x,
                        top: y,
                        selectable: true,
                        evented: true,
                        subTargetCheck: true, // Allow individual objects in group to be targeted
                        isArrow: true,
                    });

                    canvas.add(arrow);
                    currentShapeRef.current = arrow;
                    break;
                }

                case 'squiggly': {
                    // SQUIGGLY - drag to draw
                    const path = new fabric.Path(`M ${x} ${y} Q ${x} ${y}, ${x} ${y}`, {
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        fill: '',
                        selectable: true,
                        evented: true,
                        isSquiggly: true,
                    });
                    canvas.add(path);
                    currentShapeRef.current = path;
                    break;
                }

                default:
                    break;
            }
        };

        const handleMouseMove = (opt: FabricEvent) => {
            if (!isDrawingRef.current || !startPointRef.current || !opt.pointer) return;

            const pointer = canvas.getPointer(opt.e);
            const x = pointer.x;
            const y = pointer.y;
            const startX = startPointRef.current.x;
            const startY = startPointRef.current.y;

            const currentShape = currentShapeRef.current;
            if (!currentShape) return;

            switch (activeTool) {
                case 'rect': {
                    currentShape.set({
                        left: Math.min(x, startX),
                        top: Math.min(y, startY),
                        width: Math.abs(x - startX),
                        height: Math.abs(y - startY),
                    });
                    break;
                }

                case 'circle': {
                    const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) / 2;
                    currentShape.set({
                        left: startX - radius,
                        top: startY - radius,
                        radius: radius,
                    });
                    break;
                }

                case 'line': {
                    currentShape.set({ x2: x, y2: y });
                    break;
                }

                case 'arrow': {
                    const arrowLine = (currentShape as any).item(0);
                    const arrowHead = (currentShape as any).item(1);

                    arrowLine.set({ x2: x, y2: y });

                    // Calculate angle for arrow head
                    const angle = fabric.util.radiansToDegrees(Math.atan2(y - startY, x - startX));
                    arrowHead.set({
                        left: x,
                        top: y,
                        angle: angle + 90, // Adjust for triangle pointing up by default
                    });

                    // Update group position and dimensions
                    (currentShape as any)._calcBounds();
                    (currentShape as any)._updateObjectsCoords();
                    break;
                }

                case 'squiggly': {
                    const path = currentShape;
                    const pathData = path.path;
                    if (pathData && pathData.length > 0) {
                        // Add new point to path
                        pathData.push(['L', x, y]);
                        path.set({ path: pathData });
                    }
                    break;
                }

                default:
                    break;
            }
            canvas.renderAll();
        };

        const handleMouseUp = () => {
            if (!isDrawingRef.current) return;

            isDrawingRef.current = false;
            startPointRef.current = null;

            const currentShape = currentShapeRef.current;
            if (currentShape) {
                // Ensure the object is selectable after creation
                currentShape.set({ selectable: true, evented: true });
                canvas.setActiveObject(currentShape);
                if (activeTool === 'text') {
                    // For text tool, enter editing mode immediately
                    if (currentShape.type === 'i-text' || currentShape.type === 'textbox') {
                        currentShape.enterEditing();
                    }
                }

                canvas.renderAll();
                saveToHistory();
                notifyObjectsChange();
                onSelectionChange?.(true);
                // Switch to select tool for most shapes, but maybe keep tool active? 
                // UX decision: Usually drawing tools reset to select after one shape, unless "locked".
                // For now, reset to select.
                onToolChange?.('select');
            }
            currentShapeRef.current = null;
        };

        // Disable default drawing mode for shape tools
        // (Though handled in main tool effect, we ensure it here too)
        canvas.isDrawingMode = false;

        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
        };
    }, [isActive, isLocked, activeTool, strokeColor, fillColor, strokeWidth, scale, width, height, saveToHistory, notifyObjectsChange, onSelectionChange, onToolChange]);

    // Double-click handler for text editing (notes, text blocks)
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !isActive) return;

        const handleDoubleClick = (opt: FabricEvent) => {
            if (opt.target && (opt.target.isNoteText || opt.target.isCalloutBox || opt.target.type === 'i-text' || opt.target.type === 'textbox')) {
                const target = opt.target;
                if (target.type === 'textbox' || target.type === 'i-text') {
                    canvas.setActiveObject(target);
                    target.enterEditing();
                    onTextEditingChange?.(true, {
                        fontFamily: target.fontFamily || 'Inter, sans-serif',
                        fontSize: target.fontSize || 16,
                        fontWeight: target.fontWeight || 400,
                        italic: target.fontStyle === 'italic',
                        underline: target.underline || false,
                        align: target.textAlign || 'left',
                        color: target.fill || '#000000',
                    });
                } else if (target.isCalloutBox && target.type === 'group') {
                    // For callout group, find the text object inside
                    const textObj = target.getObjects().find((obj: any) => obj.type === 'textbox');
                    if (textObj) {
                        canvas.setActiveObject(textObj);
                        textObj.enterEditing();
                        onTextEditingChange?.(true, {
                            fontFamily: textObj.fontFamily || 'Inter, sans-serif',
                            fontSize: textObj.fontSize || 14,
                            fontWeight: textObj.fontWeight || 400,
                            italic: textObj.fontStyle === 'italic',
                            underline: textObj.underline || false,
                            align: textObj.textAlign || 'left',
                            color: textObj.fill || '#000000',
                        });
                    }
                } else if (target.isNoteBackground && target.type === 'rect') {
                    // For note background, find the text object in the same group
                    const noteId = target.noteId;
                    const noteGroup = canvas.getObjects().find((obj: any) => obj.isNoteGroup && obj.noteId === noteId);
                    if (noteGroup) {
                        const textObj = noteGroup.getObjects().find((obj: any) => obj.isNoteText);
                        if (textObj) {
                            canvas.setActiveObject(textObj);
                            textObj.enterEditing();
                            onTextEditingChange?.(true, {
                                fontFamily: textObj.fontFamily || 'Inter, sans-serif',
                                fontSize: textObj.fontSize || 14,
                                fontWeight: textObj.fontWeight || 400,
                                italic: textObj.fontStyle === 'italic',
                                underline: textObj.underline || false,
                                align: textObj.textAlign || 'left',
                                color: textObj.fill || '#000000',
                            });
                        }
                    }
                }
            }
        };

        canvas.on('mouse:dblclick', handleDoubleClick);

        return () => {
            canvas.off('mouse:dblclick', handleDoubleClick);
        };
    }, [isActive, onTextEditingChange]);

    // Expose canvas instance and methods
    useImperativeHandle(ref, () => ({
        getObjects: () => fabricRef.current?.getObjects() || [],
        loadObjects: (objects: any[]) => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            // Fix: ensure objects are loaded with correct custom properties
            canvas.loadFromJSON({ objects }, () => {
                canvas.renderAll();
            });
        },
        clear: () => {
            const canvas = fabricRef.current;
            if (!canvas) return;
            canvas.clear();
            canvas.backgroundColor = 'transparent';
            saveToHistory();
            notifyObjectsChange();
        },
        undo: () => {
            const canvas = fabricRef.current;
            if (!canvas || historyIndexRef.current <= 0) return;

            historyIndexRef.current -= 1;
            const state = historyRef.current[historyIndexRef.current];
            isUndoRedoRef.current = true;
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                isUndoRedoRef.current = false;
                onHistoryChange?.(
                    historyIndexRef.current > 0,
                    historyIndexRef.current < historyRef.current.length - 1
                );
                notifyObjectsChange();
            });
        },
        redo: () => {
            const canvas = fabricRef.current;
            if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

            historyIndexRef.current += 1;
            const state = historyRef.current[historyIndexRef.current];
            isUndoRedoRef.current = true;
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                isUndoRedoRef.current = false;
                onHistoryChange?.(
                    historyIndexRef.current > 0,
                    historyIndexRef.current < historyRef.current.length - 1
                );
                notifyObjectsChange();
            });
        },
        getCanvas: () => fabricRef.current,
        deleteSelected: () => {
            const canvas = fabricRef.current;
            if (!canvas) return;

            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
                activeObjects.forEach((obj: any) => canvas.remove(obj));
                canvas.discardActiveObject();
                canvas.renderAll();
                saveToHistory();
                notifyObjectsChange();
            }
        }
    }), [saveToHistory, notifyObjectsChange, onHistoryChange]);

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: zIndex,
                pointerEvents: isActive && isVisible && !isLocked ? 'auto' : 'none',
                opacity: isVisible ? 1 : 0,
            }}
        >
            <canvas ref={canvasRef} />
        </div>
    );
});

LayerCanvas.displayName = 'LayerCanvas';
