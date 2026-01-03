/**
 * SimplePad - Settings Store
 * Persistent settings using electron-store
 */

import Store from 'electron-store';
import type { AppSettings, PadConfig, ThemeConfig, GlassConfig } from '../shared/types.js';

// ============================================================================
// Default Values
// ============================================================================

const defaultGlassConfig: GlassConfig = {
    enabled: true,
    variant: 2, // A nice default variant
    tintColor: '#ffffff10',
    tintEnabled: true,
    opacity: 0.8,
    cornerRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff40',
};

const defaultTheme: ThemeConfig = {
    type: 'glass',
    solidColor: '#1a1a2e',
    gradient: {
        angle: 135,
        stops: [
            { color: '#667eea', position: 0 },
            { color: '#764ba2', position: 100 },
        ],
    },
    imagePath: '',
    glass: defaultGlassConfig,
};

const defaultPadTheme: ThemeConfig = {
    type: 'glass',
    solidColor: '#2d2d44',
    gradient: {
        angle: 180,
        stops: [
            { color: '#434343', position: 0 },
            { color: '#000000', position: 100 },
        ],
    },
    imagePath: '',
    glass: {
        enabled: true,
        variant: 3,
        tintColor: '#ffffff15',
        tintEnabled: true,
        opacity: 0.6,
        cornerRadius: 16,
    },
};

const defaultSettings: AppSettings = {
    grid: {
        rows: 4,
        cols: 4,
    },
    padSize: 100, // Default pad size in pixels
    padShape: 'rounded',
    defaultPadTheme,
    appBackground: defaultTheme,
    showMainTitle: true,
    audioEngine: {
        polyphonyLimit: 0, // Unlimited
        masterVolume: 1.0,
        latencyHint: 'interactive',
    },
    windowBounds: {
        main: null,
        settings: null,
    },
    keybinds: {
        trackRecord: null,
        loopRecord: null,
    },
};

// ============================================================================
// Store Schema
// ============================================================================

interface StoreSchema {
    settings: AppSettings;
    pads: PadConfig[];
}

let storeInstance: Store<StoreSchema> | null = null;

export function initStore(): Store<StoreSchema> {
    if (!storeInstance) {
        storeInstance = new Store<StoreSchema>({
            name: 'simplepad-config',
            defaults: {
                settings: defaultSettings,
                pads: [],
            },
        });
    }
    return storeInstance;
}

// ============================================================================
// Settings Operations
// ============================================================================

export function getSettings(): AppSettings {
    const store = initStore();
    return store.get('settings', defaultSettings);
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
    const store = initStore();
    const current = store.get('settings', defaultSettings);
    const updated = { ...current, ...settings };
    store.set('settings', updated);
    return updated;
}

// ============================================================================
// Pad Operations
// ============================================================================

export function getAllPads(): PadConfig[] {
    const store = initStore();
    return store.get('pads', []);
}

export function getPad(id: string): PadConfig | null {
    const pads = getAllPads();
    return pads.find((p) => p.id === id) || null;
}

export function savePad(config: PadConfig): PadConfig[] {
    const store = initStore();
    const pads = getAllPads();
    const index = pads.findIndex((p) => p.id === config.id);

    if (index >= 0) {
        pads[index] = config;
    } else {
        pads.push(config);
    }

    store.set('pads', pads);
    return pads;
}

export function deletePad(id: string): PadConfig[] {
    const store = initStore();
    const pads = getAllPads().filter((p) => p.id !== id);
    store.set('pads', pads);
    return pads;
}

// ============================================================================
// Export defaults for use elsewhere
// ============================================================================

export { defaultSettings, defaultTheme, defaultPadTheme, defaultGlassConfig };
