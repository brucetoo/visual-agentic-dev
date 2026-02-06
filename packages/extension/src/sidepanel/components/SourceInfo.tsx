import React from 'react';
import type { SourceLocation, ElementInfo } from '../../shared/types';

interface SourceInfoProps {
    source: SourceLocation;
    elementInfo: ElementInfo | null;
    onClear: () => void;
}

export const SourceInfo: React.FC<SourceInfoProps> = ({ source, elementInfo, onClear }) => {
    const fileName = source.fileName.split('/').pop() || source.fileName;

    return (
        <div className="source-info">
            <div className="source-header">
                <span className="source-label">选中元素</span>
                <button className="clear-selection" onClick={onClear} title="清除选择">
                    ✕
                </button>
            </div>
            <code className="source-location">
                {fileName}:{source.lineNumber}
            </code>
            {elementInfo && (
                <div className="element-info">
                    <span className="tag-name">&lt;{elementInfo.tagName}&gt;</span>
                    {elementInfo.className && (
                        <span className="class-name">.{elementInfo.className.split(' ')[0]}</span>
                    )}
                </div>
            )}
        </div>
    );
};
