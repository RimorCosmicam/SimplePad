/**
 * SimplePad - Preload Script
 * Exposes safe IPC methods to renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, PadConfig, PreloadAPI } from '../shared/types.js';

// ============================================================================
// API Implementation
// ============================================================================

const api: PreloadAPI = {
    // ---------------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------------

    getSettings: () => ipcRenderer.invoke('settings:get'),

    saveSettings: (settings: Partial<AppSettings>) =>
        ipcRenderer.invoke('settings:set', settings),

    onSettingsChanged: (callback: (settings: AppSettings) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings) => {
            callback(settings);
        };
        ipcRenderer.on('settings:changed', listener);
        return () => ipcRenderer.removeListener('settings:changed', listener);
    },

    // ---------------------------------------------------------------------------
    // Pads
    // ---------------------------------------------------------------------------

    getAllPads: () => ipcRenderer.invoke('pad:get-all'),

    getPad: (id: string) => ipcRenderer.invoke('pad:get', id),

    savePad: (config: PadConfig) => ipcRenderer.invoke('pad:save', config),

    deletePad: (id: string) => ipcRenderer.invoke('pad:delete', id),

    onPadsChanged: (callback: (pads: PadConfig[]) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, pads: PadConfig[]) => {
            callback(pads);
        };
        ipcRenderer.on('pads:changed', listener);
        return () => ipcRenderer.removeListener('pads:changed', listener);
    },

    // ---------------------------------------------------------------------------
    // Audio
    // ---------------------------------------------------------------------------

    importAudioFile: () => ipcRenderer.invoke('audio:import-file'),

    downloadYouTube: async (url: string, onProgress: (progress: number) => void) => {
        // Listen for progress events from main process
        const progressListener = (_event: Electron.IpcRendererEvent, percent: number) => {
            onProgress(percent);
        };
        ipcRenderer.on('youtube:download-progress', progressListener);

        try {
            const result = await ipcRenderer.invoke('audio:download-youtube', url);
            return result;
        } finally {
            ipcRenderer.removeListener('youtube:download-progress', progressListener);
        }
    },

    processAudio: (filePath: string, operation: string, params: Record<string, unknown>) =>
        ipcRenderer.invoke('audio:process', filePath, operation, params),

    getAudioBuffer: (filePath: string) => ipcRenderer.invoke('audio:get-buffer', filePath),

    // ---------------------------------------------------------------------------
    // Windows
    // ---------------------------------------------------------------------------

    openSettings: () => ipcRenderer.send('window:open-settings'),

    openPadConfig: (padId: string) => ipcRenderer.send('window:open-pad-config', padId),

    closeWindow: () => ipcRenderer.send('window:close'),

    getPadIdFromQuery: () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('padId');
    },

    // ---------------------------------------------------------------------------
    // Glass
    // ---------------------------------------------------------------------------

    setGlassVariant: (variant: number) => ipcRenderer.send('glass:set-variant', variant),

    // ---------------------------------------------------------------------------
    // Project Management
    // ---------------------------------------------------------------------------

    saveProject: (recordingBlob: ArrayBuffer | null) =>
        ipcRenderer.invoke('project:save', recordingBlob),

    loadProject: () =>
        ipcRenderer.invoke('project:load'),

    exportRecording: (recordingBlob: ArrayBuffer, format: 'mp3' | 'wav' | 'ogg', trackName: string) =>
        ipcRenderer.invoke('project:export', recordingBlob, format, trackName),

    // ---------------------------------------------------------------------------
    // Platform
    // ---------------------------------------------------------------------------

    platform: process.platform,
};

// ============================================================================
// Expose API
// ============================================================================

contextBridge.exposeInMainWorld('api', api);
