/**
 * SimplePad - Settings Window Component
 * Configure app background, default pad theme, grid size, and audio settings
 */

import React, { useEffect, useState } from 'react';
import { useAppStore, useSettings, useGridConfig } from '../store/appStore';
import { ThemeControls } from '../components/ThemeControls';
import type { ThemeConfig } from '@shared/types';
import './SettingsWindow.css';

type SettingsTab = 'general' | 'background' | 'pads' | 'audio' | 'keybinds';

export function SettingsWindow(): React.ReactElement {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [listeningFor, setListeningFor] = useState<'trackRecord' | 'loopRecord' | null>(null);
    const initialize = useAppStore((s) => s.initialize);
    const settings = useSettings();
    const gridConfig = useGridConfig();
    const updateSettings = useAppStore((s) => s.updateSettings);

    // Initialize store
    useEffect(() => {
        const init = async () => {
            await initialize();
            setIsLoading(false);
        };
        init();
    }, [initialize]);

    // Handle app background change
    const handleAppBackgroundChange = (theme: ThemeConfig) => {
        updateSettings({ appBackground: theme });

        // Update native glass if glass is enabled
        if (theme.type === 'glass' && theme.glass.enabled) {
            window.api.setGlassVariant(theme.glass.variant);
        }
    };

    // Handle default pad theme change
    const handleDefaultPadThemeChange = (theme: ThemeConfig) => {
        updateSettings({ defaultPadTheme: theme });
    };

    // Handle grid size change
    const handleGridRowsChange = (delta: number) => {
        if (gridConfig) {
            const newRows = Math.max(1, Math.min(10, gridConfig.rows + delta));
            updateSettings({ grid: { ...gridConfig, rows: newRows } });
        }
    };

    const handleGridColsChange = (delta: number) => {
        if (gridConfig) {
            const newCols = Math.max(1, Math.min(10, gridConfig.cols + delta));
            updateSettings({ grid: { ...gridConfig, cols: newCols } });
        }
    };

    // Toggle main window title
    const handleToggleMainTitle = () => {
        if (settings) {
            updateSettings({ showMainTitle: !settings.showMainTitle });
        }
    };

    // Handle audio settings change
    const handleMasterVolumeChange = (volume: number) => {
        if (settings) {
            updateSettings({
                audioEngine: { ...settings.audioEngine, masterVolume: volume },
            });
        }
    };

    const handlePolyphonyChange = (limit: number) => {
        if (settings) {
            updateSettings({
                audioEngine: { ...settings.audioEngine, polyphonyLimit: limit },
            });
        }
    };

    // Handle keybind change
    const handleKeybindChange = (key: 'trackRecord' | 'loopRecord', value: string | null) => {
        if (settings) {
            updateSettings({
                keybinds: { ...settings.keybinds, [key]: value },
            });
        }
    };

    // Key capture effect
    useEffect(() => {
        if (!listeningFor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            let key = e.key.toLowerCase();
            if (e.key === ' ') key = 'space';
            if (e.key === 'Escape') {
                setListeningFor(null);
                return;
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                handleKeybindChange(listeningFor, null);
                setListeningFor(null);
                return;
            }

            handleKeybindChange(listeningFor, key);
            setListeningFor(null);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [listeningFor, settings]);

    if (isLoading || !settings) {
        return (
            <div className="settings-window loading">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="settings-window">
            {/* Titlebar */}
            <header className="titlebar drag-region">
                <div className="titlebar-spacer" />
                <h1 className="titlebar-title">Settings</h1>
                <div className="titlebar-spacer" />
            </header>

            {/* Tab Navigation */}
            <nav className="settings-tabs">
                <button
                    className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`settings-tab ${activeTab === 'background' ? 'active' : ''}`}
                    onClick={() => setActiveTab('background')}
                >
                    Background
                </button>
                <button
                    className={`settings-tab ${activeTab === 'pads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pads')}
                >
                    Pads
                </button>
                <button
                    className={`settings-tab ${activeTab === 'audio' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audio')}
                >
                    Audio
                </button>
                <button
                    className={`settings-tab ${activeTab === 'keybinds' ? 'active' : ''}`}
                    onClick={() => setActiveTab('keybinds')}
                >
                    Keybinds
                </button>
            </nav>

            {/* Content */}
            <main className="settings-content">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <section className="settings-section animate-fade-in">
                        <h2 className="section-title">General Settings</h2>
                        <p className="section-description">
                            Configure grid layout and window appearance.
                        </p>

                        <div className="settings-group">
                            {/* Grid Size */}
                            <div className="settings-row">
                                <label className="settings-label">Grid Size</label>
                                <div className="grid-size-row">
                                    <div className="grid-control">
                                        <span className="grid-control-label">Columns</span>
                                        <div className="grid-size-controls">
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleGridColsChange(-1)}
                                                disabled={!gridConfig || gridConfig.cols <= 1}
                                            >
                                                −
                                            </button>
                                            <span className="grid-size-value">{gridConfig?.cols ?? 4}</span>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleGridColsChange(1)}
                                                disabled={!gridConfig || gridConfig.cols >= 10}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <span className="grid-multiply">×</span>
                                    <div className="grid-control">
                                        <span className="grid-control-label">Rows</span>
                                        <div className="grid-size-controls">
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleGridRowsChange(-1)}
                                                disabled={!gridConfig || gridConfig.rows <= 1}
                                            >
                                                −
                                            </button>
                                            <span className="grid-size-value">{gridConfig?.rows ?? 4}</span>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                onClick={() => handleGridRowsChange(1)}
                                                disabled={!gridConfig || gridConfig.rows >= 10}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Show Window Title */}
                            <div className="settings-row toggle-row-inline">
                                <label className="settings-label">Show Window Title</label>
                                <button
                                    className={`toggle ${settings.showMainTitle ? 'active' : ''}`}
                                    onClick={handleToggleMainTitle}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* Background Tab */}
                {activeTab === 'background' && (
                    <section className="settings-section animate-fade-in">
                        <h2 className="section-title">App Background</h2>
                        <p className="section-description">
                            Configure the main window background. Changes apply immediately.
                        </p>

                        <ThemeControls
                            theme={settings.appBackground}
                            onChange={handleAppBackgroundChange}
                            showGlassVariant
                        />
                    </section>
                )}

                {/* Pads Tab */}
                {activeTab === 'pads' && (
                    <section className="settings-section animate-fade-in">
                        <h2 className="section-title">Default Pad Theme</h2>
                        <p className="section-description">
                            Set the default appearance for new pads. Individual pads can override this.
                        </p>

                        <ThemeControls
                            theme={settings.defaultPadTheme}
                            onChange={handleDefaultPadThemeChange}
                            showGlassVariant
                        />
                    </section>
                )}

                {/* Audio Tab */}
                {activeTab === 'audio' && (
                    <section className="settings-section animate-fade-in">
                        <h2 className="section-title">Audio Engine</h2>
                        <p className="section-description">
                            Configure audio playback settings.
                        </p>

                        <div className="settings-group">
                            <div className="settings-row">
                                <label className="settings-label">Master Volume</label>
                                <div className="settings-slider-group">
                                    <input
                                        type="range"
                                        className="slider"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={settings.audioEngine.masterVolume}
                                        onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                                    />
                                    <span className="settings-value">
                                        {Math.round(settings.audioEngine.masterVolume * 100)}%
                                    </span>
                                </div>
                            </div>

                            <div className="settings-row">
                                <label className="settings-label">Polyphony Limit</label>
                                <div className="settings-slider-group">
                                    <input
                                        type="range"
                                        className="slider"
                                        min="0"
                                        max="32"
                                        step="1"
                                        value={settings.audioEngine.polyphonyLimit}
                                        onChange={(e) => handlePolyphonyChange(parseInt(e.target.value, 10))}
                                    />
                                    <span className="settings-value">
                                        {settings.audioEngine.polyphonyLimit === 0 ? '∞' : settings.audioEngine.polyphonyLimit}
                                    </span>
                                </div>
                            </div>

                            <div className="settings-row">
                                <label className="settings-label">Latency Mode</label>
                                <div className="settings-button-group">
                                    {(['interactive', 'balanced', 'playback'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            className={`btn btn-secondary ${settings.audioEngine.latencyHint === mode ? 'active' : ''}`}
                                            onClick={() => updateSettings({
                                                audioEngine: { ...settings.audioEngine, latencyHint: mode },
                                            })}
                                        >
                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Keybinds Tab */}
                {activeTab === 'keybinds' && (
                    <section className="settings-section animate-fade-in">
                        <h2 className="section-title">Keyboard Shortcuts</h2>
                        <p className="section-description">
                            Configure keyboard shortcuts for recording. Click a field and press a key to bind it. Press Backspace to clear.
                        </p>

                        <div className="settings-group">
                            <div className="settings-row toggle-row-inline">
                                <label className="settings-label">Track Record</label>
                                <div
                                    className={`keybind-cap ${listeningFor === 'trackRecord' ? 'listening' : ''}`}
                                    onClick={() => setListeningFor(listeningFor === 'trackRecord' ? null : 'trackRecord')}
                                    title="Click to set keybind, press Backspace to clear"
                                >
                                    {listeningFor === 'trackRecord' ? 'Press a key...' : (settings.keybinds?.trackRecord?.toUpperCase() || 'Not Set')}
                                </div>
                            </div>

                            <div className="settings-row toggle-row-inline">
                                <label className="settings-label">Loop Record</label>
                                <div
                                    className={`keybind-cap ${listeningFor === 'loopRecord' ? 'listening' : ''}`}
                                    onClick={() => setListeningFor(listeningFor === 'loopRecord' ? null : 'loopRecord')}
                                    title="Click to set keybind, press Backspace to clear"
                                >
                                    {listeningFor === 'loopRecord' ? 'Press a key...' : (settings.keybinds?.loopRecord?.toUpperCase() || 'Not Set')}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
