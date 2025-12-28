import React from 'react';
import { SemanticSection, SemanticBlock } from '@/types/semantic';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

// --- Sub-Components (The "Bricks") ---

// 1. Heading Block
const HeadingBlock = ({ block }: { block: SemanticBlock }) => {
  // Heuristic: If confidence is low, maybe it's just bold text? 
  // For now, we trust the AI layout model.
  const Tag = block.content.length < 60 ? 'h2' : 'h3';
  
  return (
    <div className="group relative -ml-8 pl-8 my-4">
      {/* Drag Handle (Visible on Hover) */}
      <div className="absolute left-0 top-1.5 opacity-0 group-hover:opacity-100 cursor-grab text-gray-300 transition-opacity p-1 hover:bg-gray-100 rounded">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <Tag 
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "font-bold text-gray-900 outline-none rounded px-1 decoration-clone focus:bg-blue-50/50",
          Tag === 'h2' ? "text-2xl tracking-tight mb-3 mt-6" : "text-xl text-gray-800 mb-2 mt-4"
        )}
      >
        {block.content}
      </Tag>
    </div>
  );
};

// 2. Standard Paragraph
const ParagraphBlock = ({ block }: { block: SemanticBlock }) => (
  <p 
    contentEditable
    suppressContentEditableWarning
    className="text-gray-700 leading-relaxed mb-3 text-[16px] outline-none focus:bg-blue-50/50 rounded px-1 transition-colors empty:hidden"
  >
    {block.content}
  </p>
);

// 3. List Group
const ListBlock = ({ blocks }: { blocks: SemanticBlock[] }) => (
  <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700 marker:text-gray-400">
    {blocks.map((b) => (
      <li 
        key={b.id}
        contentEditable
        suppressContentEditableWarning
        className="pl-1 outline-none focus:bg-blue-50/50 rounded"
      >
        {b.content}
      </li>
    ))}
  </ul>
);

// 4. Code Block
const CodeBlock = ({ block }: { block: SemanticBlock }) => (
  <div className="relative group my-6">
    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto font-mono text-sm leading-relaxed shadow-sm border border-slate-800">
      <code 
        contentEditable
        suppressContentEditableWarning
        className="outline-none block"
      >
        {block.content}
      </code>
    </pre>
    <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-sans uppercase tracking-wider select-none">
      Code
    </div>
  </div>
);

// 5. Table Group (Reconstructed Data Grid)
const TableBlock = ({ blocks }: { blocks: SemanticBlock[] }) => {
  // Heuristic: Assume first row is header if confidence is high or simply style it distinctively
  // Since we rely on row-based extraction, we map rows here.
  
  return (
    <div className="overflow-hidden my-8 border border-gray-200 rounded-lg shadow-sm bg-white">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs font-semibold">
          <tr>
            <th className="px-6 py-3 border-b border-gray-200">
              Extracted Content
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {blocks.map((row) => (
            <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
              <td 
                contentEditable
                suppressContentEditableWarning
                className="px-6 py-3 outline-none focus:bg-blue-100/50 cursor-text text-gray-700"
              >
                {row.content}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Main Engine ---

export const SmartRenderer = ({ sections }: { sections: SemanticSection[] }) => {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="smart-renderer-container max-w-[850px] mx-auto bg-white min-h-[1100px] shadow-sm border border-gray-100 p-12 sm:p-16 transition-all">
      {sections.map((section) => {
        // A. Handle Grouped Sections (Lists, Tables)
        if (section.type === 'list_group') {
          return <ListBlock key={section.id} blocks={section.blocks} />;
        }
        
        if (section.type === 'table_group') {
          return <TableBlock key={section.id} blocks={section.blocks} />;
        }

        // B. Handle Standard Sections (Mixed Content)
        return (
          <div key={section.id} className="section-standard relative group/section mb-4">
            {section.blocks.map((block) => {
              switch (block.type) {
                case 'heading': 
                  return <HeadingBlock key={block.id} block={block} />;
                case 'paragraph': 
                  return <ParagraphBlock key={block.id} block={block} />;
                case 'code_block':
                  return <CodeBlock key={block.id} block={block} />;
                case 'list_item':
                  // Fallback for isolated list items not grouped by assembler
                  return <ListBlock key={block.id} blocks={[block]} />;
                case 'table_row':
                   // Fallback for isolated table rows
                   return <TableBlock key={block.id} blocks={[block]} />;
                default: 
                  return <ParagraphBlock key={block.id} block={block} />;
              }
            })}
          </div>
        );
      })}
    </div>
  );
};
