/**
 * SimplePad - Pad Component
 * Individual pad with audio playback and theming
 */

import React, { useCallback, useEffect } from 'react';
import { useIsPadPlaying, useSettings } from '../store/appStore';
import { audioEngine } from '../audio/engine';
import type { PadConfig, ThemeConfig } from '@shared/types';
import './Pad.css';

interface PadProps {
    row: number;
    col: number;
    config: PadConfig | null;
    defaultTheme: ThemeConfig | null;
}

// Helper to convert hex to rgba
function hexToRgba(hex: string, defaultAlpha = 0.15): string {
    if (!hex || !hex.startsWith('#')) return 'transparent';

    if (hex.length === 9) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const a = parseInt(hex.slice(7, 9), 16) / 255;
        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    } else if (hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${defaultAlpha})`;
    }
    return hex;
}

export function Pad({ row, col, config, defaultTheme }: PadProps): React.ReactElement {
    const padId = config?.id || `pad-${row}-${col}`;
    const isPlaying = useIsPadPlaying(padId);
    const settings = useSettings();
    const padShape = settings?.padShape || 'rounded';
    const isEmpty = !config?.audio;

    // Resolve theme (pad-specific or default)
    const theme = config?.theme || defaultTheme;

    // Load audio when pad has audio config
    // Use JSON.stringify to properly detect deep changes in the audio config
    const audioConfigKey = config?.audio ? JSON.stringify(config.audio) : null;
    useEffect(() => {
        if (config?.audio) {
            console.log(`Pad ${padId}: Loading audio from ${config.audio.filePath}`);
            audioEngine.loadAudio(padId, config.audio).catch(console.error);
        }
        return () => {
            if (config?.audio) {
                audioEngine.unloadAudio(padId);
            }
        };
    }, [padId, audioConfigKey]);

    // Handle pad click
    const handleClick = useCallback(() => {
        if (isEmpty) {
            audioEngine.stopAll();
            window.api.openPadConfig(padId);
        } else {
            audioEngine.playPad(padId, config?.retriggerBehavior || 'layer');
        }
    }, [isEmpty, padId, config?.retriggerBehavior]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        audioEngine.stopAll();
        window.api.openPadConfig(padId);
    }, [padId]);

    // Get background style - NO useMemo to ensure updates work
    const getBackgroundStyle = (): React.CSSProperties => {
        if (!theme) return {};

        switch (theme.type) {
            case 'solid':
                return { backgroundColor: theme.solidColor };

            case 'gradient': {
                const stops = theme.gradient.stops
                    .map((s) => `${s.color} ${s.position}%`)
                    .join(', ');
                return {
                    background: `linear-gradient(${theme.gradient.angle}deg, ${stops})`,
                };
            }

            case 'image':
                return {
                    backgroundImage: `url(${theme.imagePath})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                };

            case 'glass': {
                const tintEnabled = theme.glass.tintEnabled !== false;
                const tint = tintEnabled ? hexToRgba(theme.glass.tintColor || '#ffffff', 0.15) : 'transparent';
                return {
                    '--pad-glass-opacity': String(theme.glass.opacity ?? 0.6),
                    '--pad-glass-tint': tint,
                    '--pad-glass-radius': `${theme.glass.cornerRadius ?? 16}px`,
                } as React.CSSProperties;
            }

            default:
                return {};
        }
    };

    const isGlass = theme?.type === 'glass';
    const backgroundStyle = getBackgroundStyle();

    return (
        <button
            className={`pad pad-shape-${padShape} ${isEmpty ? 'pad-empty' : 'pad-configured'} ${isPlaying ? 'pad-playing' : ''} ${isGlass ? 'pad-glass' : ''}`}
            style={backgroundStyle}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {isGlass && <div className="pad-glass-overlay" />}

            <div className="pad-content">
                {isEmpty ? (
                    <span className="pad-add-icon">+</span>
                ) : (
                    <>
                        {config?.label && <span className="pad-label">{config.label}</span>}
                        {config?.keyBinding && <span className="pad-keybinding">{config.keyBinding}</span>}
                    </>
                )}
            </div>

            {isPlaying && (
                <div className="pad-playing-indicator">
                    <div className="pad-playing-bar" />
                    <div className="pad-playing-bar" />
                    <div className="pad-playing-bar" />
                </div>
            )}
        </button>
    );
}
