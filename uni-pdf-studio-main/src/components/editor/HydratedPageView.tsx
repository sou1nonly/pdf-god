import React from 'react';
import { HydratedPage } from '@/types/hydration';

// Extend HydratedPage to include backgroundUrl which is added by the hook
interface HydratedPageWithUrl extends HydratedPage {
  backgroundUrl?: string;
}

interface HydratedPageViewProps {
  page: HydratedPageWithUrl;
  scale?: number;
}

export const HydratedPageView: React.FC<HydratedPageViewProps> = ({ page, scale = 1.0 }) => {
  return (
    <div 
      className="relative bg-white shadow-sm border border-gray-200 mx-auto mb-8 overflow-hidden"
      style={{
        width: page.dims.width * scale,
        height: page.dims.height * scale,
      }}
    >
      {/* Paint Layer (Background) */}
      {page.backgroundUrl ? (
        <img 
          src={page.backgroundUrl} 
          alt={`Page ${page.pageIndex + 1} Background`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-50 opacity-50 pointer-events-none" />
      )}
      
      {/* Semantic Layer */}
      {page.blocks.map((block) => {
        const [x, y, w, h] = block.box;
        
        if (block.type === 'image') {
          const imageUrl = (block as any).imageUrl;
          if (!imageUrl) return null;

          return (
            <div
              key={block.id}
              className="absolute hover:outline hover:outline-1 hover:outline-blue-500 focus:outline focus:outline-2 focus:outline-blue-600 z-10"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${w}%`,
                height: `${h}%`,
                // Debug border
                border: '1px dashed rgba(0,0,0,0.1)'
              }}
            >
              <img 
                src={imageUrl} 
                alt="Extracted" 
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>
          );
        }

        if (block.type === 'table') {
          const [bx, by, bw, bh] = block.box;
          
          return (
            <div
              key={block.id}
              className="absolute z-10 group"
              style={{
                left: `${bx}%`,
                top: `${by}%`,
                width: `${bw}%`,
                height: `${bh}%`,
                // Main table border (top and left only, cells handle right and bottom)
                borderTop: '1px solid #000',
                borderLeft: '1px solid #000',
                backgroundColor: 'white' // Ensure we cover any background artifacts
              }}
            >
              {/* Visual indicator for table group on hover */}
              <div className="absolute inset-0 border border-blue-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
              
              {(block as any).rows.map((row: any, rowIndex: number) => (
                <React.Fragment key={rowIndex}>
                  {row.cells.map((cell: any, cellIndex: number) => {
                    // Calculate relative position within the table block
                    // cell.box is [x, y, w, h] in page %
                    // block.box is [bx, by, bw, bh] in page %
                    
                    const [cx, cy, cw, ch] = cell.box;
                    
                    // Avoid division by zero
                    const safeBw = bw || 1;
                    const safeBh = bh || 1;
                    
                    const relLeft = (cx - bx) / safeBw * 100;
                    const relTop = (cy - by) / safeBh * 100;
                    const relWidth = cw / safeBw * 100;
                    const relHeight = ch / safeBh * 100;

                    return (
                      <div
                        key={`${rowIndex}-${cellIndex}`}
                        contentEditable
                        suppressContentEditableWarning
                        className="absolute hover:bg-blue-100 focus:bg-blue-100 outline-none transition-colors"
                        style={{
                          left: `${relLeft}%`,
                          top: `${relTop}%`,
                          width: `${relWidth}%`,
                          height: `${relHeight}%`,
                          fontSize: cell.styles?.fontSize ? `${cell.styles.fontSize * scale}px` : '12px',
                          fontFamily: cell.styles?.fontFamily || 'sans-serif',
                          fontWeight: cell.styles?.fontWeight || 400,
                          color: cell.styles?.color || '#000000',
                          lineHeight: '1.2', // Better line height for wrapped text
                          overflow: 'hidden', // Clip overflow
                          // Cell borders (right and bottom to form grid)
                          borderRight: '1px solid #000',
                          borderBottom: '1px solid #000',
                          paddingLeft: '4px', // Increased padding
                          paddingRight: '4px',
                          display: 'flex',
                          alignItems: 'center', // Vertical center
                          whiteSpace: 'normal', // Allow wrapping if needed
                          wordBreak: 'break-word' // Prevent overflow
                        }}
                      >
                        {cell.content}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          );
        }

        return (
          <div
            key={block.id}
            contentEditable
            suppressContentEditableWarning
            className="absolute hover:outline hover:outline-1 hover:outline-blue-500 focus:outline focus:outline-2 focus:outline-blue-600 z-10"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
              fontFamily: block.styles.fontFamily || '"Times New Roman", Times, serif',
              fontSize: `${block.styles.fontSize * scale}px`,
              fontWeight: block.styles.fontWeight,
              color: block.styles.color,
              textAlign: block.styles.align,
              whiteSpace: 'pre-wrap',
              lineHeight: block.styles.lineHeight ? `${block.styles.lineHeight}px` : '1.2',
              // Debug border removed for cleaner look
              border: '1px solid transparent', 
            }}
          >
            {block.html}
          </div>
        );
      })}
      
      {/* Debug Info Overlay */}
      <div className="absolute top-0 right-0 bg-black/50 text-white text-xs p-1 pointer-events-none">
        Page {page.pageIndex + 1} | {page.blocks.length} blocks
      </div>
    </div>
  );
};
