/**
 * SimplePad - Theme Controls Component
 * Reusable theme editor for backgrounds
 */

import React, { useCallback } from 'react';
import { GlassVariantPicker } from './GlassVariantPicker';
import type { ThemeConfig, BackgroundType, GradientStop } from '@shared/types';
import './ThemeControls.css';

interface ThemeControlsProps {
    theme: ThemeConfig;
    onChange: (theme: ThemeConfig) => void;
    showGlassVariant?: boolean;
    showCornerRadius?: boolean; // Only show for pads, not background
}

export function ThemeControls({
    theme,
    onChange,
    showGlassVariant = false,
    showCornerRadius = true, // Default true for pads
}: ThemeControlsProps): React.ReactElement {

    // Ensure tintEnabled has a default value
    const tintEnabled = theme.glass?.tintEnabled ?? true;

    // Handle type change
    const handleTypeChange = useCallback((type: BackgroundType) => {
        onChange({ ...theme, type });
    }, [theme, onChange]);

    // Handle solid color change
    const handleSolidColorChange = useCallback((color: string) => {
        onChange({ ...theme, solidColor: color });
    }, [theme, onChange]);

    // Handle gradient changes
    const handleGradientAngleChange = useCallback((angle: number) => {
        onChange({
            ...theme,
            gradient: { ...theme.gradient, angle },
        });
    }, [theme, onChange]);

    const handleGradientStopChange = useCallback((index: number, stop: GradientStop) => {
        const newStops = [...theme.gradient.stops];
        newStops[index] = stop;
        onChange({
            ...theme,
            gradient: { ...theme.gradient, stops: newStops },
        });
    }, [theme, onChange]);

    // Handle image change
    const handleImageChange = useCallback(async () => {
        // Use file dialog via IPC
        const result = await window.api.importAudioFile(); // Reuse for now
        if (result) {
            onChange({ ...theme, imagePath: result.path });
        }
    }, [theme, onChange]);

    // Handle glass config changes
    const handleGlassEnabledChange = useCallback((enabled: boolean) => {
        onChange({
            ...theme,
            glass: { ...theme.glass, enabled },
        });
    }, [theme, onChange]);

    const handleGlassVariantChange = useCallback((variant: number) => {
        onChange({
            ...theme,
            glass: { ...theme.glass, variant },
        });
    }, [theme, onChange]);

    const handleGlassOpacityChange = useCallback((opacity: number) => {
        onChange({
            ...theme,
            glass: { ...theme.glass, opacity },
        });
    }, [theme, onChange]);

    const handleTintEnabledChange = useCallback(() => {
        console.log('Toggling tint, current:', tintEnabled);
        onChange({
            ...theme,
            glass: { ...theme.glass, tintEnabled: !tintEnabled },
        });
    }, [theme, onChange, tintEnabled]);

    const handleGlassTintChange = useCallback((tintColor: string) => {
        onChange({
            ...theme,
            glass: { ...theme.glass, tintColor },
        });
    }, [theme, onChange]);

    const handleGlassCornerRadiusChange = useCallback((cornerRadius: number) => {
        onChange({
            ...theme,
            glass: { ...theme.glass, cornerRadius },
        });
    }, [theme, onChange]);

    return (
        <div className="theme-controls">
            {/* Type Selector */}
            <div className="theme-type-selector">
                {(['solid', 'gradient', 'image', 'glass'] as BackgroundType[]).map((type) => (
                    <button
                        key={type}
                        className={`theme-type-btn ${theme.type === type ? 'active' : ''}`}
                        onClick={() => handleTypeChange(type)}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* Solid Color Controls */}
            {theme.type === 'solid' && (
                <div className="theme-section">
                    <label className="theme-label">Color</label>
                    <div className="color-picker-row">
                        <input
                            type="color"
                            className="color-picker"
                            value={theme.solidColor}
                            onChange={(e) => handleSolidColorChange(e.target.value)}
                        />
                        <input
                            type="text"
                            className="input color-input"
                            value={theme.solidColor}
                            onChange={(e) => handleSolidColorChange(e.target.value)}
                            placeholder="#000000"
                        />
                    </div>
                </div>
            )}

            {/* Gradient Controls */}
            {theme.type === 'gradient' && (
                <div className="theme-section">
                    <div className="gradient-preview" style={{
                        background: `linear-gradient(${theme.gradient.angle}deg, ${theme.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`,
                    }} />

                    <label className="theme-label">Angle</label>
                    <div className="slider-row">
                        <input
                            type="range"
                            className="slider"
                            min="0"
                            max="360"
                            value={theme.gradient.angle}
                            onChange={(e) => handleGradientAngleChange(parseInt(e.target.value, 10))}
                        />
                        <span className="slider-value">{theme.gradient.angle}°</span>
                    </div>

                    <label className="theme-label">Color Stops</label>
                    {theme.gradient.stops.map((stop, index) => (
                        <div key={index} className="gradient-stop-row">
                            <input
                                type="color"
                                className="color-picker"
                                value={stop.color}
                                onChange={(e) => handleGradientStopChange(index, { ...stop, color: e.target.value })}
                            />
                            <input
                                type="range"
                                className="slider"
                                min="0"
                                max="100"
                                value={stop.position}
                                onChange={(e) => handleGradientStopChange(index, { ...stop, position: parseInt(e.target.value, 10) })}
                            />
                            <span className="slider-value">{stop.position}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Controls */}
            {theme.type === 'image' && (
                <div className="theme-section">
                    {theme.imagePath && (
                        <div className="image-preview" style={{
                            backgroundImage: `url(${theme.imagePath})`,
                        }} />
                    )}
                    <button className="btn btn-secondary" onClick={handleImageChange}>
                        Choose Image
                    </button>
                </div>
            )}

            {/* Glass Controls */}
            {theme.type === 'glass' && (
                <div className="theme-section">
                    <div className="toggle-row">
                        <label className="theme-label">Enable Glass Effect</label>
                        <button
                            className={`toggle ${theme.glass.enabled ? 'active' : ''}`}
                            onClick={() => handleGlassEnabledChange(!theme.glass.enabled)}
                        />
                    </div>

                    {theme.glass.enabled && (
                        <>
                            {showGlassVariant && (
                                <>
                                    <label className="theme-label">Glass Variant</label>
                                    <GlassVariantPicker
                                        selectedVariant={theme.glass.variant}
                                        onSelect={handleGlassVariantChange}
                                    />
                                </>
                            )}

                            <label className="theme-label">Opacity</label>
                            <div className="slider-row">
                                <input
                                    type="range"
                                    className="slider"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={theme.glass.opacity}
                                    onChange={(e) => handleGlassOpacityChange(parseFloat(e.target.value))}
                                />
                                <span className="slider-value">{Math.round(theme.glass.opacity * 100)}%</span>
                            </div>

                            {/* Corner Radius - only show for pads */}
                            {showCornerRadius && (
                                <>
                                    <label className="theme-label">Corner Radius</label>
                                    <div className="slider-row">
                                        <input
                                            type="range"
                                            className="slider"
                                            min="0"
                                            max="32"
                                            value={theme.glass.cornerRadius}
                                            onChange={(e) => handleGlassCornerRadiusChange(parseInt(e.target.value, 10))}
                                        />
                                        <span className="slider-value">{theme.glass.cornerRadius}px</span>
                                    </div>
                                </>
                            )}

                            {/* Tint Toggle */}
                            <div className="toggle-row">
                                <label className="theme-label">Enable Tint</label>
                                <button
                                    className={`toggle ${tintEnabled ? 'active' : ''}`}
                                    onClick={handleTintEnabledChange}
                                    type="button"
                                />
                            </div>

                            {tintEnabled && (
                                <>
                                    <label className="theme-label">Tint Color</label>
                                    <div className="color-picker-row">
                                        <input
                                            type="color"
                                            className="color-picker"
                                            value={(theme.glass.tintColor || '#ffffff').slice(0, 7)}
                                            onChange={(e) => handleGlassTintChange(e.target.value + (theme.glass.tintColor?.slice(7) || '66'))}
                                        />
                                        <input
                                            type="text"
                                            className="input color-input"
                                            value={theme.glass.tintColor || '#ffffff66'}
                                            onChange={(e) => handleGlassTintChange(e.target.value)}
                                            placeholder="#ffffff66"
                                        />
                                    </div>

                                    <label className="theme-label">Tint Opacity</label>
                                    <div className="slider-row">
                                        <input
                                            type="range"
                                            className="slider"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={parseInt((theme.glass.tintColor || '#ffffff66').slice(7) || '66', 16) / 255}
                                            onChange={(e) => {
                                                const alpha = Math.round(parseFloat(e.target.value) * 255).toString(16).padStart(2, '0');
                                                const baseColor = (theme.glass.tintColor || '#ffffff').slice(0, 7);
                                                handleGlassTintChange(baseColor + alpha);
                                            }}
                                        />
                                        <span className="slider-value">{Math.round(parseInt((theme.glass.tintColor || '#ffffff66').slice(7) || '66', 16) / 255 * 100)}%</span>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
