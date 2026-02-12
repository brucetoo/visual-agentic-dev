import React from 'react';
import type { SelectedElement } from '../../shared/types';

interface SourceInfoProps {
    selectedElements: SelectedElement[];
    onRemove: (index: number) => void;
    onClear: () => void;
}

export const SourceInfo: React.FC<SourceInfoProps> = ({ selectedElements, onRemove, onClear }) => {
    if (selectedElements.length === 0) return null;

    return (
        <div className="source-info">
            <div className="source-header">
                <span className="source-label">Selected Elements ({selectedElements.length})</span>
                <button className="clear-selection" onClick={onClear} title="Clear All">
                    ✕
                </button>
            </div>
            <div className="selected-elements-list" style={{ display: 'flex', flexDirection: 'row', gap: '4px', overflowX: 'auto' }}>
                {selectedElements.map((item, index) => {
                    const fileName = item.source.fileName.split('/').pop() || item.source.fileName;
                    return (
                        <div key={index} className="selected-item" style={{
                            flex: 1,
                            minWidth: 0, // Allow flex items to shrink below content size
                            padding: '6px',
                            background: 'var(--vdev-bg)',
                            borderRadius: '4px',
                            position: 'relative',
                            border: '1px solid var(--vdev-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => onRemove(index)}
                                style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    border: 'none',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: 'var(--vdev-text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0
                                }}
                                title="Remove"
                            >✕</button>

                            <code className="source-location" style={{ fontSize: '11px', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {fileName}:{item.source.lineNumber}
                            </code>
                            <div className="element-info" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span className="tag-name">&lt;{item.elementInfo.tagName}&gt;</span>
                            </div>
                            {item.elementInfo.textContent && (
                                <div style={{ fontSize: '10px', color: 'var(--vdev-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                    {item.elementInfo.textContent.substring(0, 20)}{item.elementInfo.textContent.length > 20 ? '…' : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
