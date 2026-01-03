/**
 * SimplePad - Glass Variant Picker Component
 * Visual selector for glass variants 0-19
 */

import React from 'react';
import './GlassVariantPicker.css';

interface GlassVariantPickerProps {
    selectedVariant: number;
    onSelect: (variant: number) => void;
}

// Variants 0-15 and 19 are documented as functional
const VARIANTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19];

// Variant descriptions for tooltips
const VARIANT_DESCRIPTIONS: Record<number, string> = {
    0: 'Default',
    1: 'Light',
    2: 'Medium',
    3: 'Dark',
    4: 'Ultra Light',
    5: 'Extra Light',
    6: 'Light Tint',
    7: 'Medium Tint',
    8: 'Dark Tint',
    9: 'Subtle',
    10: 'Emphasized',
    11: 'Prominent',
    12: 'Popover',
    13: 'Menu',
    14: 'Sheet',
    15: 'Sidebar',
    19: 'Desktop',
};

// Generate preview gradient based on variant
function getVariantPreview(variant: number): string {
    // Create visual representations - these are approximations
    const hue = (variant * 25) % 360;
    const saturation = 10 + (variant % 5) * 10;
    const lightness = 20 + (variant % 4) * 15;
    const opacity = 0.3 + (variant % 6) * 0.1;

    return `
    radial-gradient(
      ellipse at 30% 30%,
      hsla(${hue}, ${saturation}%, ${lightness + 40}%, ${opacity}) 0%,
      hsla(${hue + 20}, ${saturation}%, ${lightness}%, ${opacity * 0.5}) 100%
    ),
    linear-gradient(
      135deg,
      rgba(255, 255, 255, ${0.1 + (variant % 5) * 0.05}) 0%,
      rgba(0, 0, 0, ${0.05 + (variant % 3) * 0.02}) 100%
    )
  `;
}

export function GlassVariantPicker({
    selectedVariant,
    onSelect,
}: GlassVariantPickerProps): React.ReactElement {

    return (
        <div className="glass-variant-picker">
            {VARIANTS.map((variant) => (
                <button
                    key={variant}
                    className={`glass-variant-item ${selectedVariant === variant ? 'selected' : ''}`}
                    style={{ background: getVariantPreview(variant) }}
                    onClick={() => onSelect(variant)}
                    title={VARIANT_DESCRIPTIONS[variant] || `Variant ${variant}`}
                >
                    <span className="glass-variant-number">{variant}</span>
                    {selectedVariant === variant && (
                        <span className="glass-variant-check">✓</span>
                    )}
                </button>
            ))}
        </div>
    );
}
