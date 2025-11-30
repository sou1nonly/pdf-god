import { SemanticBlock, SemanticSection, SectionType } from '@/types/semantic';

/**
 * The Assembler: Takes a flat list of labeled blocks and builds a structured semantic tree.
 */
export function assemblePage(blocks: SemanticBlock[]): SemanticSection[] {
  const sections: SemanticSection[] = [];
  
  let buffer: SemanticBlock[] = [];

  // Helper to flush current buffer into a section
  const flushSection = (type: SectionType = 'standard') => {
    if (buffer.length > 0) {
      sections.push({
        id: crypto.randomUUID(),
        type,
        blocks: [...buffer]
      });
      buffer = [];
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = blocks[i - 1];

    // LOGIC 1: Headings always start new sections
    if (block.type === 'heading') {
      flushSection(); // Close previous content
      buffer.push(block);
      // We keep headings in the buffer to start the next standard section
      continue;
    }

    // LOGIC 2: Detect Lists (Grouping consecutive list items)
    if (block.type === 'list_item') {
      if (prevBlock?.type !== 'list_item') {
        flushSection('standard'); // End standard text, start list
      }
      buffer.push(block);
      
      // If next item is NOT a list item, flush this list group immediately
      const nextBlock = blocks[i + 1];
      if (nextBlock?.type !== 'list_item') {
        flushSection('list_group');
      }
      continue;
    }

    // LOGIC 3: Detect Tables
    if (block.type === 'table_row') {
      if (prevBlock?.type !== 'table_row') {
        flushSection('standard');
      }
      buffer.push(block);
      
      const nextBlock = blocks[i + 1];
      if (nextBlock?.type !== 'table_row') {
        flushSection('table_group');
      }
      continue;
    }

    // Default: Add to current buffer (Standard Paragraphs)
    buffer.push(block);
  }

  // Final flush
  flushSection();

  return sections;
}