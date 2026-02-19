/**
 * AI Document Editing Tools
 *
 * Enables natural-language document editing via Gemini structured output.
 * The AI receives the document's section tree and returns JSON actions
 * that are executed against the useSemanticDocument hook.
 */

import type { SemanticSection, SectionType } from './types';

// ============================================================================
// Action Types
// ============================================================================

export interface UpdateAction {
    action: 'update_section';
    /** ID of the section to update */
    sectionId: string;
    /** New Typst content */
    typstContent: string;
}

export interface AddAction {
    action: 'add_section';
    /** Section type */
    type: SectionType;
    /** Plain text content (for display) */
    content: string;
    /** Typst markup content */
    typstContent: string;
    /** Heading level (1-6), only for type='heading' */
    level?: number;
    /** Insert after this section ID. Null = append at end */
    afterSectionId?: string | null;
}

export interface DeleteAction {
    action: 'delete_section';
    /** ID of the section to remove */
    sectionId: string;
}

export type AIEditAction = UpdateAction | AddAction | DeleteAction;

// ============================================================================
// Result types
// ============================================================================

export interface AIEditResult {
    /** Whether the AI returned document editing actions */
    isEdit: boolean;
    /** The actions to execute (empty if isEdit is false) */
    actions: AIEditAction[];
    /** A human-readable message from the AI (always present) */
    message: string;
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function sectionTreeToContext(sections: SemanticSection[]): string {
    return sections.map((s, i) => {
        const typeLabel = s.type === 'heading' ? `heading (level ${s.level || 1})` : s.type;
        const preview = s.content.slice(0, 80).replace(/\n/g, ' ');
        return `  [${i}] id="${s.id}" type=${typeLabel} → "${preview}"`;
    }).join('\n');
}

export function buildEditSystemPrompt(sections: SemanticSection[]): string {
    const tree = sectionTreeToContext(sections);

    return `You are an AI document editor for a PDF editing application. The user's document is represented as a tree of semantic sections. Each section has an ID, type, and Typst markup content.

CURRENT DOCUMENT STRUCTURE:
${tree}

YOUR CAPABILITIES:
1. **update_section** — Modify an existing section's content (rewrite, restyle, translate, etc.)
2. **add_section** — Add a new section (heading, paragraph, list, etc.)
3. **delete_section** — Remove a section by ID

TYPST FORMATTING REFERENCE:
- Bold: #text(weight: "bold")[content]
- Italic: #text(style: "italic")[content]
- Font size: #text(size: 14pt)[content]
- Color: #text(fill: rgb("#3366cc"))[content]
- Combined: #text(size: 12pt, weight: "bold", fill: rgb("#333"))[content]
- Center: #align(center)[content]
- Bullet list: Use "- item" on separate lines
- Line break: Use \\ or #v(4pt) for spacing

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact shape:
{
  "actions": [
    // Array of action objects (can be empty if just answering a question)
  ],
  "message": "A friendly message explaining what you did or answering the question"
}

ACTION SCHEMAS:
- Update: {"action": "update_section", "sectionId": "<id>", "typstContent": "<new typst>"}
- Add: {"action": "add_section", "type": "<heading|paragraph|list>", "content": "<plain text>", "typstContent": "<typst markup>", "level": <1-6 for headings>, "afterSectionId": "<id or null>"}
- Delete: {"action": "delete_section", "sectionId": "<id>"}

RULES:
1. If the user asks a question about the document (not an edit), return empty actions and answer in the message.
2. If the user requests an edit, return the appropriate actions AND a confirmation message.
3. Always use valid Typst markup in typstContent fields.
4. For update_section, use the exact sectionId from the document structure above.
5. For add_section, set afterSectionId to place the new section logically (e.g., after the last heading of the same group). Use null to append at the end.
6. You can return multiple actions in a single response for complex requests.
7. Keep the message concise and friendly.

RESPOND WITH ONLY THE JSON OBJECT. No markdown fences, no extra text.`;
}

// ============================================================================
// Gemini API Caller
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function callGeminiForEdit(
    userPrompt: string,
    sections: SemanticSection[],
): Promise<AIEditResult> {
    if (!GEMINI_API_KEY) {
        return {
            isEdit: false,
            actions: [],
            message: 'AI is not configured. Please set VITE_GEMINI_API_KEY.',
        };
    }

    const systemPrompt = buildEditSystemPrompt(sections);

    const body = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            temperature: 0.3, // Low temp for structured output
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Gemini API error');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        return { isEdit: false, actions: [], message: 'No response from AI.' };
    }

    // Parse the JSON response
    try {
        const parsed = JSON.parse(rawText);
        const actions: AIEditAction[] = Array.isArray(parsed.actions) ? parsed.actions : [];
        const message = parsed.message || 'Done.';

        return {
            isEdit: actions.length > 0,
            actions,
            message,
        };
    } catch (e) {
        // If JSON parsing fails, treat it as a plain message
        return {
            isEdit: false,
            actions: [],
            message: rawText,
        };
    }
}

// ============================================================================
// Action Executor
// ============================================================================

export interface SemanticHookMethods {
    updateSection: (id: string, content: string) => void;
    addSection: (section: { type: SectionType; content: string; typstContent: string; level?: number }, afterId?: string | null) => string;
    deleteSection: (id: string) => void;
}

export function executeActions(
    actions: AIEditAction[],
    methods: SemanticHookMethods,
): string[] {
    const summaries: string[] = [];

    for (const action of actions) {
        switch (action.action) {
            case 'update_section':
                methods.updateSection(action.sectionId, action.typstContent);
                summaries.push(`✏️ Updated section \`${action.sectionId}\``);
                break;

            case 'add_section': {
                const newId = methods.addSection(
                    {
                        type: action.type,
                        content: action.content,
                        typstContent: action.typstContent,
                        level: action.level,
                    },
                    action.afterSectionId,
                );
                summaries.push(`➕ Added ${action.type}: "${action.content.slice(0, 40)}"`);
                break;
            }

            case 'delete_section':
                methods.deleteSection(action.sectionId);
                summaries.push(`🗑️ Removed section \`${action.sectionId}\``);
                break;
        }
    }

    return summaries;
}
