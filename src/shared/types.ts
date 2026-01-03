/**
 * SimplePad - Shared Types
 * Types used across main and renderer processes
 */

// ============================================================================
// Theme Types
// ============================================================================

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'glass';

export interface GradientStop {
    color: string;
    position: number; // 0-100
}

export interface GlassConfig {
    enabled: boolean;
    variant: number; // 0-19
    tintColor: string;
    tintEnabled: boolean;
    opacity: number; // 0-1
    cornerRadius: number;
    borderWidth?: number; // 0-5px
    borderColor?: string; // hex with alpha
}

export interface ThemeConfig {
    type: BackgroundType;
    solidColor: string;
    gradient: {
        angle: number;
        stops: GradientStop[];
    };
    imagePath: string;
    glass: GlassConfig;
}

// ============================================================================
// App Settings Types
// ============================================================================

export type PadShape =
    | 'square'
    | 'rounded'
    | 'circle'
    | 'diamond'
    | 'hexagon'
    | 'octagon'
    | 'star'
    | 'heart'
    | 'triangle'
    | 'squircle';

export interface AppSettings {
    grid: {
        rows: number;
        cols: number;
    };
    padSize: number;
    padShape: PadShape;
    defaultPadTheme: ThemeConfig;
    appBackground: ThemeConfig;
    showMainTitle: boolean;
    audioEngine: {
        polyphonyLimit: number;
        masterVolume: number;
        latencyHint: 'interactive' | 'balanced' | 'playback';
    };
    windowBounds: {
        main: { x: number; y: number; width: number; height: number } | null;
        settings: { x: number; y: number; width: number; height: number } | null;
    };
    keybinds: {
        trackRecord: string | null;
        loopRecord: string | null;
    };
}

export interface AudioConfig {
    filePath: string;
    originalName: string;
    duration: number; // seconds
    trimStart: number; // seconds
    trimEnd: number; // seconds
    fadeInDuration: number; // seconds
    fadeOutDuration: number; // seconds
    normalized: boolean;
    loop: boolean;
    volume: number; // 0-1
    playbackRate: number; // 0.5-2.0
    detune: number; // -1200 to 1200 (cents)
    pan: number; // -1 to 1

    // Core Effects
    reverb: {
        enabled: boolean;
        mix: number; // 0-1
        roomSize: number; // 0-1
    };
    delay: {
        enabled: boolean;
        time: number; // 0-5s
        feedback: number; // 0-1
        mix: number; // 0-1
    };
    chorus: {
        enabled: boolean;
        rate: number; // 0-10Hz
        depth: number; // 0-1
        mix: number; // 0-1
    };
    flanger: {
        enabled: boolean;
        rate: number; // 0-10Hz
        depth: number; // 0-1
        feedback: number; // 0-1
        mix: number; // 0-1
    };
    phaser: {
        enabled: boolean;
        rate: number; // 0-10Hz
        depth: number; // 0-1
        mix: number; // 0-1
    };
    eq: {
        enabled: boolean;
        low: number; // -12 to 12 dB
        mid: number; // -12 to 12 dB
        high: number; // -12 to 12 dB
    };
    compressor: {
        enabled: boolean;
        threshold: number; // -60 to 0 dB
        ratio: number; // 1 to 20
        attack: number; // 0 to 1s
        release: number; // 0 to 1s
    };
    limiter: {
        enabled: boolean;
        threshold: number; // -20 to 0 dB
    };
    deEsser: {
        enabled: boolean;
        frequency: number; // 2k to 10k
        amount: number; // 0-1
    };
    distortion: {
        enabled: boolean;
        amount: number; // 0-1
    };
    tremolo: {
        enabled: boolean;
        rate: number; // 0-20Hz
        depth: number; // 0-1
    };
    vibrato: {
        enabled: boolean;
        rate: number; // 0-20Hz
        depth: number; // 0-1
    };
    bitcrusher: {
        enabled: boolean;
        bits: number; // 1-16
        normfreq: number; // 0-1
    };
    exciter: {
        enabled: boolean;
        amount: number; // 0-1
    };
    noiseReduction: {
        enabled: boolean;
        amount: number; // 0-1
    };

    mixer?: {
        leftGain: number; // 0-1
        rightGain: number; // 0-1
        centerGain: number; // 0-1
        isMono?: boolean;
    };
}

export interface PadConfig {
    id: string;
    row: number;
    col: number;
    label: string;
    audio: AudioConfig | null;
    theme: ThemeConfig | null; // null = use default
    keyBinding: string | null;
    retriggerBehavior: 'restart' | 'stop' | 'layer';
    holdMode: 'loop' | 'continue' | 'none';
}

// ============================================================================
// Grid Types
// ============================================================================

export interface GridConfig {
    rows: number;
    cols: number;
}

// ============================================================================
// IPC Types
// ============================================================================

export interface IPCChannels {
    // Settings
    'settings:get': () => AppSettings;
    'settings:set': (settings: Partial<AppSettings>) => void;
    'settings:changed': (settings: AppSettings) => void;

    // Pads
    'pad:get-all': () => PadConfig[];
    'pad:get': (id: string) => PadConfig | null;
    'pad:save': (config: PadConfig) => void;
    'pad:delete': (id: string) => void;
    'pads:changed': (pads: PadConfig[]) => void;

    // Audio
    'audio:import-file': (filePath: string) => { id: string; path: string };
    'audio:download-youtube': (url: string) => { id: string; path: string; progress: number };
    'audio:process': (
        id: string,
        operation: 'trim' | 'fade' | 'normalize' | 'voice-isolate' | 'remove-voice' | 'noise-reduce',
        params: Record<string, unknown>
    ) => { success: boolean; path: string };

    // Windows
    'window:open-settings': () => void;
    'window:open-pad-config': (padId: string) => void;
    'window:close': () => void;

    // Glass
    'glass:set-variant': (variant: number) => void;
}

// ============================================================================
// Preload API
// ============================================================================

export interface PreloadAPI {
    // Settings
    getSettings: () => Promise<AppSettings>;
    saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
    onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;

    // Pads
    getAllPads: () => Promise<PadConfig[]>;
    getPad: (id: string) => Promise<PadConfig | null>;
    savePad: (config: PadConfig) => Promise<void>;
    deletePad: (id: string) => Promise<void>;
    onPadsChanged: (callback: (pads: PadConfig[]) => void) => () => void;

    // Audio
    importAudioFile: () => Promise<{ id: string; path: string; name: string } | null>;
    downloadYouTube: (
        url: string,
        onProgress: (progress: number) => void
    ) => Promise<{ id: string; path: string }>;
    processAudio: (
        filePath: string,
        operation: string,
        params: Record<string, unknown>
    ) => Promise<{ success: boolean; path: string }>;
    getAudioBuffer: (filePath: string) => Promise<ArrayBuffer>;

    // Windows
    openSettings: () => void;
    openPadConfig: (padId: string) => void;
    closeWindow: () => void;
    getPadIdFromQuery: () => string | null;

    // Glass
    setGlassVariant: (variant: number) => void;

    // Project Management
    saveProject: (recordingBlob: ArrayBuffer | null) => Promise<{ success: boolean; path?: string }>;
    loadProject: () => Promise<{ success: boolean } | null>;
    exportRecording: (recordingBlob: ArrayBuffer, format: 'mp3' | 'wav' | 'ogg', trackName: string) => Promise<{ success: boolean; path?: string }>;

    // Platform
    platform: NodeJS.Platform;
}

declare global {
    interface Window {
        api: PreloadAPI;
    }
}
