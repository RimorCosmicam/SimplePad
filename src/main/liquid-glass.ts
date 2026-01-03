/**
 * SimplePad - Liquid Glass Utilities
 * Wrapper around electron-liquid-glass for managing glass effects
 */

import { BrowserWindow } from 'electron';
import liquidGlass from 'electron-liquid-glass';
import type { GlassConfig } from '../shared/types.js';

interface GlassOptions {
    cornerRadius?: number;
    tintColor?: string;
    opaque?: boolean;
}

/**
 * Apply glass effect to a window
 * Returns the glass view ID for future operations
 */
export function applyGlassEffect(
    window: BrowserWindow,
    options: GlassOptions = {}
): number | null {
    try {
        const handle = window.getNativeWindowHandle();
        const glassId = liquidGlass.addView(handle, {
            cornerRadius: options.cornerRadius ?? 0,
            tintColor: options.tintColor ?? '#00000010',
            opaque: options.opaque ?? false,
        });
        return glassId;
    } catch (error) {
        console.error('Failed to apply glass effect:', error);
        return null;
    }
}

/**
 * Set the glass variant (0-19)
 * Uses experimental API
 */
export function setGlassVariant(glassId: number, variant: number): void {
    try {
        // Clamp to valid range (0-15 and 19 are functional per docs)
        const clampedVariant = Math.max(0, Math.min(19, variant));
        liquidGlass.unstable_setVariant(glassId, clampedVariant);
    } catch (error) {
        console.error('Failed to set glass variant:', error);
    }
}

/**
 * Set scrim overlay (0 = off, 1 = on)
 */
export function setGlassScrim(glassId: number, enabled: boolean): void {
    try {
        liquidGlass.unstable_setScrim(glassId, enabled ? 1 : 0);
    } catch (error) {
        console.error('Failed to set glass scrim:', error);
    }
}

/**
 * Set subdued state (0 = normal, 1 = subdued)
 */
export function setGlassSubdued(glassId: number, subdued: boolean): void {
    try {
        liquidGlass.unstable_setSubdued(glassId, subdued ? 1 : 0);
    } catch (error) {
        console.error('Failed to set glass subdued state:', error);
    }
}

/**
 * Apply full glass configuration to a window
 */
export function applyGlassConfig(
    glassId: number,
    config: GlassConfig
): void {
    if (!config.enabled) return;

    setGlassVariant(glassId, config.variant);
}

/**
 * Create CSS-based glass fallback for elements within the renderer
 * This is for elements like pads that can't use native glass
 */
export function createGlassCSSVariables(config: GlassConfig): Record<string, string> {
    const opacity = config.opacity ?? 0.7;
    const tint = config.tintColor || 'rgba(255, 255, 255, 0.1)';

    return {
        '--glass-opacity': String(opacity),
        '--glass-tint': tint,
        '--glass-blur': `${20}px`,
        '--glass-border': 'rgba(255, 255, 255, 0.2)',
        '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
        '--glass-corner-radius': `${config.cornerRadius}px`,
    };
}
