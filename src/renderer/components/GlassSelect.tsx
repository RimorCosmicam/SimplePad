/**
 * SimplePad - Glass Select Component
 * Custom dropdown with Liquid Glass aesthetic
 */

import React, { useState, useRef, useEffect } from 'react';
import './GlassSelect.css';

interface Option {
    value: string;
    label: string;
}

interface GlassSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    title?: string;
    className?: string;
}

export function GlassSelect({
    value,
    options,
    onChange,
    title,
    className = '',
}: GlassSelectProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className={`glass-select-container ${className}`} ref={containerRef}>
            <div
                className={`glass-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={handleToggle}
                title={title}
            >
                <span className="glass-select-value">{selectedOption?.label}</span>
                <span className="glass-select-arrow">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>

            {isOpen && (
                <div className="glass-select-dropdown animate-in">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`glass-select-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => handleSelect(opt.value)}
                        >
                            {opt.label}
                            {opt.value === value && (
                                <span className="glass-select-check">✓</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
