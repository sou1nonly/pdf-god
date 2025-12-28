export type DrawingTool =
    | 'select'
    | 'draw'
    | 'eraser'
    | 'line'
    | 'arrow'
    | 'rect'
    | 'circle'
    | 'text'
    | 'highlight'
    | 'note'
    | 'squiggly'
    | 'check'
    | 'cross'
    | 'hand'
    | 'callout'
    | 'link'
    | 'signature'
    | 'image'
    | 'stamp-approved'
    | 'stamp-draft'
    | 'stamp-confidential';

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    order: number;
}
