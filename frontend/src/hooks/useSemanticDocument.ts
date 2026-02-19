import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    SemanticDocument,
    SemanticSection,
    PageInfo,
    DocumentMetadata
} from '@/lib/semantic/types';
import { parseTypstSource } from '@/lib/semantic/parser';
import { generateTypstSource } from '@/lib/semantic/generator';
import { DEFAULT_EXTRACTOR_CONFIG } from '@/lib/semantic/types';

/**
 * Hook to manage a semantic document state with two-way sync.
 */
export function useSemanticDocument(initialDoc: SemanticDocument) {
    const [typstSource, setTypstSource] = useState(initialDoc.typstSource);
    const [sections, setSections] = useState<SemanticSection[]>(initialDoc.structure.sections);

    // Derived state for quick lookup
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

    /**
     * Update a section's content and regenerate the Typst source.
     */
    const updateSection = useCallback((sectionId: string, newContent: string) => {
        setSections(prevSections => {
            const updateInTree = (items: SemanticSection[]): SemanticSection[] => {
                return items.map(item => {
                    if (item.id === sectionId) {
                        return { ...item, typstContent: newContent };
                    }
                    if (item.children) {
                        return { ...item, children: updateInTree(item.children) };
                    }
                    return item;
                });
            };

            const nextSections = updateInTree(prevSections);

            // Regenerate Typst source from updated sections
            const result = generateTypstSource(
                nextSections,
                initialDoc.pageInfo,
                initialDoc.metadata,
                DEFAULT_EXTRACTOR_CONFIG
            );

            setTypstSource(result.source);
            return nextSections;
        });
    }, [initialDoc.pageInfo, initialDoc.metadata]);

    /**
     * Reset state when initial document changes
     */
    useEffect(() => {
        setTypstSource(initialDoc.typstSource);
        setSections(initialDoc.structure.sections);
    }, [initialDoc]);

    return {
        typstSource,
        sections,
        sectionIndex,
        updateSection,
        setTypstSource, // Allow bulk updates from AI/Manual edits
    };
}
