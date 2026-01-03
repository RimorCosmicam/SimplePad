/**
 * SimplePad - Application Store
 * Zustand store for app-wide state management
 */

import { create } from 'zustand';
import type { AppSettings, PadConfig } from '@shared/types';

// ============================================================================
// Store State Interface
// ============================================================================

type SidebarView = 'none' | 'settings' | 'padConfig' | 'about';

interface AppState {
    // Settings
    settings: AppSettings | null;
    settingsLoaded: boolean;

    // Pads
    pads: PadConfig[];
    padsLoaded: boolean;

    // UI State
    selectedPadId: string | null;
    isPlaying: Map<string, boolean>;
    sidebarView: SidebarView;
    editingPadId: string | null;

    // Actions
    setSettings: (settings: AppSettings) => void;
    updateSettings: (partial: Partial<AppSettings>) => void;
    setPads: (pads: PadConfig[]) => void;
    updatePad: (pad: PadConfig) => void;
    removePad: (id: string) => void;
    selectPad: (id: string | null) => void;
    setPlaying: (padId: string, playing: boolean) => void;

    // Sidebar actions
    openSettings: () => void;
    openPadConfig: (padId: string) => void;
    openAbout: () => void;
    closeSidebar: () => void;

    // Initialization
    initialize: () => Promise<AppSettings>;
}

// ============================================================================
// Default Theme (fallback)
// ============================================================================

const defaultGlassConfig = {
    enabled: true,
    variant: 2,
    tintColor: '#ffffff10',
    tintEnabled: true,
    opacity: 0.8,
    cornerRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff40',
};

const defaultSettings: AppSettings = {
    grid: { rows: 4, cols: 4 },
    padSize: 100,
    padShape: 'rounded',
    defaultPadTheme: {
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
    },
    appBackground: {
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
    },
    showMainTitle: true,
    audioEngine: {
        polyphonyLimit: 0,
        masterVolume: 1.0,
        latencyHint: 'interactive',
    },
    windowBounds: {
        main: null,
        settings: null,
    },
};

// ============================================================================
// Store Creation
// ============================================================================

export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    settings: null,
    settingsLoaded: false,
    pads: [],
    padsLoaded: false,
    selectedPadId: null,
    isPlaying: new Map(),
    sidebarView: 'none',
    editingPadId: null,

    // Settings actions
    setSettings: (settings) => set({ settings, settingsLoaded: true }),

    updateSettings: async (partial) => {
        const current = get().settings;
        if (!current) return;

        // Log exactly what's being updated
        console.log('>>> updateSettings called with:', Object.keys(partial));
        if (partial.appBackground) {
            console.log('>>> Updating appBackground:', partial.appBackground.glass?.tintEnabled, partial.appBackground.glass?.tintColor);
        }
        if (partial.defaultPadTheme) {
            console.log('>>> Updating defaultPadTheme:', partial.defaultPadTheme.glass?.tintEnabled, partial.defaultPadTheme.glass?.tintColor);
        }

        const updated = { ...current, ...partial };
        set({ settings: updated });

        // Persist to main process
        await window.api.saveSettings(partial);
    },

    // Pad actions
    setPads: (pads) => set({ pads, padsLoaded: true }),

    updatePad: async (pad) => {
        const pads = get().pads;
        const index = pads.findIndex((p) => p.id === pad.id);

        let newPads: PadConfig[];
        if (index >= 0) {
            newPads = [...pads];
            newPads[index] = pad;
        } else {
            newPads = [...pads, pad];
        }

        set({ pads: newPads });
        await window.api.savePad(pad);
    },

    removePad: async (id) => {
        const pads = get().pads.filter((p) => p.id !== id);
        set({ pads });
        await window.api.deletePad(id);
    },

    // UI actions
    selectPad: (id) => set({ selectedPadId: id }),

    setPlaying: (padId, playing) => {
        const isPlaying = new Map(get().isPlaying);
        if (playing) {
            isPlaying.set(padId, true);
        } else {
            isPlaying.delete(padId);
        }
        set({ isPlaying });
    },

    // Sidebar actions
    openSettings: () => set({ sidebarView: 'settings', editingPadId: null }),
    openPadConfig: (padId) => set({ sidebarView: 'padConfig', editingPadId: padId }),
    openAbout: () => set({ sidebarView: 'about', editingPadId: null }),
    closeSidebar: () => set({ sidebarView: 'none', editingPadId: null }),

    // Initialization
    initialize: async () => {
        // Load settings from main process
        const settings = await window.api.getSettings();
        const finalSettings = settings || defaultSettings;
        set({ settings: finalSettings, settingsLoaded: true });

        // Load pads
        const pads = await window.api.getAllPads();
        set({ pads, padsLoaded: true });

        // Listen for changes from other windows (legacy, may not be needed now)
        window.api.onSettingsChanged((newSettings) => {
            set({ settings: newSettings });
        });

        window.api.onPadsChanged((newPads) => {
            set({ pads: newPads });
        });

        return finalSettings;
    },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

export const useSettings = () => useAppStore((state) => state.settings);
export const usePads = () => useAppStore((state) => state.pads);
export const useGridConfig = () => useAppStore((state) => state.settings?.grid);
export const useAppBackground = () => useAppStore((state) => state.settings?.appBackground);

// Use JSON stringify for comparison to detect nested changes
export const useDefaultPadTheme = () => {
    const theme = useAppStore((state) => state.settings?.defaultPadTheme);
    // Force re-render by returning a new object when theme content changes
    return theme;
};

export const usePadById = (id: string) => useAppStore((state) => state.pads.find((p) => p.id === id));
export const useIsPadPlaying = (id: string) => useAppStore((state) => state.isPlaying.get(id) || false);
export const useSidebarView = () => useAppStore((state) => state.sidebarView);
export const useEditingPadId = () => useAppStore((state) => state.editingPadId);
