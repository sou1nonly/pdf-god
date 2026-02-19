import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    SemanticDocument,
    SemanticSection,
    SectionType,
    PageInfo,
    DocumentMetadata
} from '@/lib/semantic/types';
import { parseTypstSource } from '@/lib/semantic/parser';
import { generateTypstSource } from '@/lib/semantic/generator';
import { DEFAULT_EXTRACTOR_CONFIG } from '@/lib/semantic/types';

let _idCounter = 0;
function generateSectionId(type: SectionType): string {
    _idCounter++;
    return `section-${type}-${Date.now()}-${_idCounter}`;
}

/**
 * Hook to manage a semantic document state with full CRUD + two-way sync.
 */
export function useSemanticDocument(initialDoc: SemanticDocument) {
    const [typstSource, setTypstSource] = useState(initialDoc.typstSource);
    const [sections, setSections] = useState<SemanticSection[]>(initialDoc.structure.sections);

    // Derived index for quick lookup
    const sectionIndex = useMemo(() => {
        const index = new Map<string, SemanticSection>();
        const traverse = (items: SemanticSection[]) => {
            for (const item of items) {
                index.set(item.id, item);
                if (item.children) traverse(item.children);
            }
        };
        traverse(sections);
        return index;
    }, [sections]);

    // ===================== Helpers =====================

    const regenerateTypst = useCallback((nextSections: SemanticSection[]) => {
        const result = generateTypstSource(
            nextSections,
            initialDoc.pageInfo,
            initialDoc.metadata,
            DEFAULT_EXTRACTOR_CONFIG
        );
        setTypstSource(result.source);
    }, [initialDoc.pageInfo, initialDoc.metadata]);

    // ===================== UPDATE =====================

    const updateSection = useCallback((sectionId: string, newContent: string) => {
        setSections(prev => {
            const updateInTree = (items: SemanticSection[]): SemanticSection[] =>
                items.map(item => {
                    if (item.id === sectionId) return { ...item, typstContent: newContent, content: newContent.replace(/#[a-z]+\([^)]*\)\[|\]/g, '') };
                    if (item.children) return { ...item, children: updateInTree(item.children) };
                    return item;
                });

            const next = updateInTree(prev);
            regenerateTypst(next);
            return next;
        });
    }, [regenerateTypst]);

    // ===================== ADD =====================

    const addSection = useCallback((
        newSection: Partial<SemanticSection> & { type: SectionType; content: string; typstContent: string },
        afterSectionId?: string | null,
    ) => {
        const section: SemanticSection = {
            id: newSection.id || generateSectionId(newSection.type),
            type: newSection.type,
            level: newSection.level,
            content: newSection.content,
            typstContent: newSection.typstContent,
            styles: newSection.styles || {},
            pageIndex: newSection.pageIndex ?? 0,
            originalBox: undefined,
            meta: newSection.meta || { confidence: 1, source: 'manual', columnIndex: 0, sourceRunCount: 1 },
            children: newSection.children,
        };

        setSections(prev => {
            let next: SemanticSection[];
            if (afterSectionId) {
                const idx = prev.findIndex(s => s.id === afterSectionId);
                if (idx >= 0) {
                    next = [...prev];
                    next.splice(idx + 1, 0, section);
                } else {
                    next = [...prev, section];
                }
            } else {
                next = [...prev, section];
            }
            regenerateTypst(next);
            return next;
        });

        return section.id;
    }, [regenerateTypst]);

    // ===================== DELETE =====================

    const deleteSection = useCallback((sectionId: string) => {
        setSections(prev => {
            const removeFromTree = (items: SemanticSection[]): SemanticSection[] =>
                items
                    .filter(item => item.id !== sectionId)
                    .map(item => item.children
                        ? { ...item, children: removeFromTree(item.children) }
                        : item
                    );

            const next = removeFromTree(prev);
            regenerateTypst(next);
            return next;
        });
    }, [regenerateTypst]);

    // ===================== MOVE =====================

    const moveSection = useCallback((sectionId: string, toIndex: number) => {
        setSections(prev => {
            const idx = prev.findIndex(s => s.id === sectionId);
            if (idx < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            const clampedIndex = Math.max(0, Math.min(toIndex, next.length));
            next.splice(clampedIndex, 0, moved);
            regenerateTypst(next);
            return next;
        });
    }, [regenerateTypst]);

    // ===================== SYNC =====================

    useEffect(() => {
        setTypstSource(initialDoc.typstSource);
        setSections(initialDoc.structure.sections);
    }, [initialDoc]);

    return {
        typstSource,
        sections,
        sectionIndex,
        updateSection,
        addSection,
        deleteSection,
        moveSection,
        setTypstSource,
    };
}
