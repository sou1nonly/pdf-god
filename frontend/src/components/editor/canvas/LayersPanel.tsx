import React, { useState } from 'react';
import { Layer } from '../types';

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string;
    onSelectLayer: (id: string) => void;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onRenameLayer: (id: string, name: string) => void;
    onReorderLayer: (id: string, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
    layers,
    activeLayerId,
    onSelectLayer,
    onAddLayer,
    onDeleteLayer,
    onToggleVisibility,
    onToggleLock,
    onRenameLayer,
    onReorderLayer,
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Sort layers by order (descending so highest order appears first)
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

    const handleStartRename = (layer: Layer) => {
        setEditingId(layer.id);
        setEditName(layer.name);
    };

    const handleFinishRename = (id: string) => {
        if (editName.trim()) {
            onRenameLayer(id, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    return (
        <div className="bg-white/95 backdrop-blur border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 p-3 min-w-[200px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-gray-600">Layers</span>
                <button
                    onClick={onAddLayer}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                    title="Add Layer"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>

            {/* Layer List */}
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {sortedLayers.map((layer, index) => {
                    const isPdfContent = layer.id === 'pdf-content';
                    const canDelete = !isPdfContent && layers.filter(l => l.id !== 'pdf-content').length > 1;

                    return (
                        <div
                            key={layer.id}
                            className={`
              flex items-center gap-1 p-1.5 rounded cursor-pointer transition-all
              ${activeLayerId === layer.id
                                    ? 'bg-blue-50 border border-blue-300'
                                    : 'hover:bg-gray-50 border border-transparent'}
            `}
                            onClick={() => onSelectLayer(layer.id)}
                        >
                            {/* Layer Type Icon */}
                            {isPdfContent ? (
                                <div className="p-0.5 text-blue-500" title="PDF Content Layer">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                </div>
                            ) : (
                                <>
                                    {/* Visibility Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                        className={`p-0.5 rounded ${layer.visible ? 'text-gray-600' : 'text-gray-300'} hover:bg-gray-100`}
                                        title={layer.visible ? 'Hide' : 'Show'}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            {layer.visible ? (
                                                <>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </>
                                            ) : (
                                                <>
                                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                </>
                            )}

                            {/* Lock Toggle - not for PDF Content */}
                            {!isPdfContent && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                                    className={`p-0.5 rounded ${layer.locked ? 'text-amber-500' : 'text-gray-400'} hover:bg-gray-100`}
                                    title={layer.locked ? 'Unlock' : 'Lock'}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {layer.locked ? (
                                            <>
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0110 0v4" />
                                            </>
                                        ) : (
                                            <>
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 019.9-1" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                            )}

                            {/* Layer Name */}
                            <div className="flex-1 min-w-0">
                                {editingId === layer.id && !isPdfContent ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleFinishRename(layer.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleFinishRename(layer.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        className="w-full bg-white text-gray-800 text-xs px-1 py-0.5 rounded border border-blue-400 outline-none"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className={`text-xs truncate block ${isPdfContent ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                                        onDoubleClick={(e) => {
                                            if (!isPdfContent) {
                                                e.stopPropagation();
                                                handleStartRename(layer);
                                            }
                                        }}
                                    >
                                        {layer.name}
                                    </span>
                                )}
                            </div>

                            {/* Reorder Buttons - not for PDF Content */}
                            {!isPdfContent && (
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'up'); }}
                                        className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                        title="Move Up"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="18 15 12 9 6 15" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReorderLayer(layer.id, 'down'); }}
                                        className="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                        title="Move Down"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* Delete Button - only for annotation layers that aren't the last one */}
                            {canDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                                    className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded"
                                    title="Delete Layer"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
