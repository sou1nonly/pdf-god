/**
 * Typst Utility Functions
 * 
 * Helper functions for generating and manipulating Typst source code.
 */

// ============================================================================
// Text Escaping
// ============================================================================

/**
 * Characters that have special meaning in Typst and need escaping
 */
const TYPST_SPECIAL_CHARS = /([\\#$*_`<>@=\-+~^])/g;

/**
 * Escape special characters for Typst content mode
 */
export function escapeTypst(text: string): string {
    if (!text) return '';

    return text
        .replace(TYPST_SPECIAL_CHARS, '\\$1')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
}

/**
 * Escape text for use inside Typst strings (within quotes)
 */
export function escapeTypstString(text: string): string {
    if (!text) return '';

    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}

// ============================================================================
// Color Conversion
// ============================================================================

/**
 * Convert CSS color to Typst color format
 * Supports hex (#RGB, #RRGGBB), rgb(), and named colors
 */
export function cssColorToTypst(color: string): string {
    if (!color) return 'black';

    // Already a named color that Typst supports
    const namedColors = ['black', 'white', 'red', 'green', 'blue', 'yellow', 'purple', 'orange', 'gray'];
    if (namedColors.includes(color.toLowerCase())) {
        return color.toLowerCase();
    }

    // Hex color
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            // Expand #RGB to #RRGGBB
            const expanded = hex.split('').map(c => c + c).join('');
            return `rgb("${color.slice(0, 1)}${expanded}")`;
        }
        return `rgb("${color}")`;
    }

    // RGB/RGBA
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return `rgb(${r}, ${g}, ${b})`;
    }

    return 'black';
}

// ============================================================================
// Font Mapping
// ============================================================================

/**
 * Map common PDF font names to Typst-compatible fonts
 */
export function mapFontFamily(pdfFontName: string): string {
    const fontName = pdfFontName.toLowerCase();

    // Common mappings
    if (fontName.includes('arial') || fontName.includes('helvetica')) {
        return 'Arial';
    }
    if (fontName.includes('times')) {
        return 'Times New Roman';
    }
    if (fontName.includes('courier') || fontName.includes('mono')) {
        return 'Courier New';
    }
    if (fontName.includes('georgia')) {
        return 'Georgia';
    }
    if (fontName.includes('verdana')) {
        return 'Verdana';
    }
    if (fontName.includes('calibri')) {
        return 'Calibri';
    }

    // Default to system sans-serif
    return 'Arial';
}

// ============================================================================
// Typst Code Generation
// ============================================================================

/**
 * Generate a Typst heading
 */
export function typstHeading(level: number, content: string): string {
    const prefix = '='.repeat(Math.min(level, 6));
    return `${prefix} ${escapeTypst(content)}`;
}

/**
 * Generate styled text in Typst
 */
export function typstStyledText(
    content: string,
    styles: {
        fontSize?: number;
        color?: string;
        fontWeight?: number;
        italic?: boolean;
        underline?: boolean;
        fontFamily?: string;
    }
): string {
    const escapedContent = escapeTypst(content);
    const styleAttrs: string[] = [];

    if (styles.fontSize) {
        styleAttrs.push(`size: ${styles.fontSize}pt`);
    }
    if (styles.color && styles.color !== '#000000' && styles.color !== 'black') {
        styleAttrs.push(`fill: ${cssColorToTypst(styles.color)}`);
    }
    if (styles.fontFamily) {
        styleAttrs.push(`font: "${mapFontFamily(styles.fontFamily)}"`);
    }
    if (styles.fontWeight && styles.fontWeight >= 600) {
        styleAttrs.push(`weight: "bold"`);
    }

    let result = escapedContent;

    // Wrap in text() if we have style attributes
    if (styleAttrs.length > 0) {
        result = `#text(${styleAttrs.join(', ')})[${result}]`;
    }

    // Apply italic
    if (styles.italic) {
        result = `#emph[${result}]`;
    }

    // Apply underline
    if (styles.underline) {
        result = `#underline[${result}]`;
    }

    return result;
}

/**
 * Generate absolute positioned content in Typst
 * Used as fallback when semantic layout isn't possible
 */
export function typstPlace(
    content: string,
    x: number,
    y: number,
    options?: {
        width?: number;
        align?: 'left' | 'center' | 'right';
    }
): string {
    const attrs: string[] = [
        'top + left',
        `dx: ${x.toFixed(1)}pt`,
        `dy: ${y.toFixed(1)}pt`,
    ];

    return `#place(${attrs.join(', ')})[${content}]`;
}

/**
 * Generate a page setup block
 */
export function typstPageSetup(
    width: number,
    height: number,
    margins?: { top?: number; bottom?: number; left?: number; right?: number }
): string {
    const attrs: string[] = [
        `width: ${width}pt`,
        `height: ${height}pt`,
    ];

    if (margins) {
        const marginParts: string[] = [];
        if (margins.top !== undefined) marginParts.push(`top: ${margins.top}pt`);
        if (margins.bottom !== undefined) marginParts.push(`bottom: ${margins.bottom}pt`);
        if (margins.left !== undefined) marginParts.push(`left: ${margins.left}pt`);
        if (margins.right !== undefined) marginParts.push(`right: ${margins.right}pt`);
        if (marginParts.length > 0) {
            attrs.push(`margin: (${marginParts.join(', ')})`);
        }
    }

    return `#set page(${attrs.join(', ')})`;
}

/**
 * Generate a list item
 */
export function typstListItem(content: string, ordered: boolean = false, index?: number): string {
    const escapedContent = escapeTypst(content);
    if (ordered && index !== undefined) {
        return `+ ${escapedContent}`;
    }
    return `- ${escapedContent}`;
}

/**
 * Generate paragraph alignment
 */
export function typstAlign(align: 'left' | 'center' | 'right' | 'justify', content: string): string {
    if (align === 'left') return content;  // Default
    if (align === 'justify') return `#set par(justify: true)\n${content}`;
    return `#align(${align})[${content}]`;
}

// ============================================================================
// Section ID Generation
// ============================================================================

let sectionIdCounter = 0;

/**
 * Generate a unique section ID
 */
export function generateSectionId(type: string): string {
    sectionIdCounter++;
    return `${type}-${Date.now().toString(36)}-${sectionIdCounter.toString(36)}`;
}

/**
 * Reset section ID counter (for testing)
 */
export function resetSectionIdCounter(): void {
    sectionIdCounter = 0;
}

// ============================================================================
// Typst Document Template
// ============================================================================

/**
 * Generate the standard document header/preamble
 */
export function typstDocumentPreamble(metadata?: {
    title?: string;
    author?: string;
}): string {
    const lines: string[] = [
        '// Generated by PDF-God Semantic Engine',
        `// Created: ${new Date().toISOString()}`,
        '',
    ];

    if (metadata?.title) {
        lines.push(`#set document(title: "${escapeTypstString(metadata.title)}")`);
    }
    if (metadata?.author) {
        lines.push(`#set document(author: "${escapeTypstString(metadata.author)}")`);
    }

    // Default text settings — balanced to approximate PDF layout
    lines.push('#set text(font: "Arial", size: 10pt, tracking: 0.5pt, spacing: 150%)');
    lines.push('#set par(justify: false, leading: 0.55em, spacing: 0.7em)');
    lines.push('#set block(spacing: 0.65em)');
    lines.push('');

    return lines.join('\n');
}
