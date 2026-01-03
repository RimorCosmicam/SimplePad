/**
 * SimplePad - Settings Panel (Sidebar)
 * Settings displayed as a slide-in panel instead of separate window
 */

import React from 'react';
import { useAppStore, useSettings, useGridConfig } from '../store/appStore';
import { ThemeControls } from './ThemeControls';
import type { ThemeConfig } from '@shared/types';
import './SettingsPanel.css';

type SettingsTab = 'general' | 'background' | 'pads' | 'audio';

export function SettingsPanel(): React.ReactElement {
    const [activeTab, setActiveTab] = React.useState<SettingsTab>('general');
    const settings = useSettings();
    const gridConfig = useGridConfig();
    const updateSettings = useAppStore((s) => s.updateSettings);
    const closeSidebar = useAppStore((s) => s.closeSidebar);
    const openAbout = useAppStore((s) => s.openAbout);

    if (!settings) return <div className="settings-panel loading"><div className="loading-spinner" /></div>;

    // Handle app background change
    const handleAppBackgroundChange = (theme: ThemeConfig) => {
        console.log('>>> handleAppBackgroundChange:', {
            tintEnabled: theme.glass?.tintEnabled,
            tintColor: theme.glass?.tintColor
        });
        updateSettings({ appBackground: theme });
        if (theme.type === 'glass' && theme.glass.enabled) {
            window.api.setGlassVariant(theme.glass.variant);
        }
    };

    // Handle default pad theme change
    const handleDefaultPadThemeChange = (theme: ThemeConfig) => {
        console.log('>>> handleDefaultPadThemeChange:', {
            tintEnabled: theme.glass?.tintEnabled,
            tintColor: theme.glass?.tintColor
        });
        updateSettings({ defaultPadTheme: theme });
    };

    // Grid controls
    const handleGridChange = (rows: number, cols: number) => {
        updateSettings({ grid: { rows, cols } });
    };

    return (
        <div className="settings-panel">
            {/* Header */}
            <header className="panel-header">
                <h2 className="panel-title">Settings</h2>
                <button className="btn btn-icon btn-ghost" onClick={closeSidebar} title="Close">
                    ✕
                </button>
            </header>

            {/* Tabs */}
            <nav className="panel-tabs">
                {(['general', 'background', 'pads', 'audio'] as SettingsTab[]).map((tab) => (
                    <button
                        key={tab}
                        className={`panel-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <div className="panel-content">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <section className="panel-section">
                        <h3 className="section-title">Grid Size</h3>
                        <div className="grid-controls">
                            <div className="grid-control">
                                <span>Columns</span>
                                <div className="stepper">
                                    <button onClick={() => gridConfig && handleGridChange(gridConfig.rows, Math.max(1, gridConfig.cols - 1))}>−</button>
                                    <span>{gridConfig?.cols ?? 4}</span>
                                    <button onClick={() => gridConfig && handleGridChange(gridConfig.rows, Math.min(10, gridConfig.cols + 1))}>+</button>
                                </div>
                            </div>
                            <span className="grid-multiply">×</span>
                            <div className="grid-control">
                                <span>Rows</span>
                                <div className="stepper">
                                    <button onClick={() => gridConfig && handleGridChange(Math.max(1, gridConfig.rows - 1), gridConfig.cols)}>−</button>
                                    <span>{gridConfig?.rows ?? 4}</span>
                                    <button onClick={() => gridConfig && handleGridChange(Math.min(10, gridConfig.rows + 1), gridConfig.cols)}>+</button>
                                </div>
                            </div>
                        </div>

                        <div className="setting-row">
                            <span>Show Window Title</span>
                            <button
                                className={`toggle ${settings.showMainTitle ? 'active' : ''}`}
                                onClick={() => updateSettings({ showMainTitle: !settings.showMainTitle })}
                            />
                        </div>

                        <h3 className="section-title">Pad Size</h3>
                        <div className="setting-row">
                            <span>Size</span>
                            <div className="slider-group">
                                <input
                                    type="range"
                                    min="60"
                                    max="200"
                                    step="10"
                                    value={settings.padSize ?? 100}
                                    onChange={(e) => updateSettings({ padSize: parseInt(e.target.value, 10) })}
                                />
                                <span>{settings.padSize ?? 100}px</span>
                            </div>
                        </div>

                        <button className="btn btn-secondary about-btn" onClick={openAbout}>
                            About SimplePad
                        </button>
                    </section>
                )}

                {/* Background Tab */}
                {activeTab === 'background' && (
                    <section className="panel-section">
                        <h3 className="section-title">App Background</h3>
                        <ThemeControls
                            theme={settings.appBackground}
                            onChange={handleAppBackgroundChange}
                            showGlassVariant
                            showCornerRadius={false}
                        />
                    </section>
                )}

                {/* Pads Tab */}
                {activeTab === 'pads' && (
                    <section className="panel-section">
                        <h3 className="section-title">Default Pad Theme</h3>
                        <p className="section-desc">Set the default appearance for new pads.</p>
                        <ThemeControls
                            theme={settings.defaultPadTheme}
                            onChange={handleDefaultPadThemeChange}
                            showGlassVariant
                        />
                    </section>
                )}

                {/* Audio Tab */}
                {activeTab === 'audio' && (
                    <section className="panel-section">
                        <h3 className="section-title">Audio Engine</h3>

                        <div className="setting-row">
                            <span>Master Volume</span>
                            <div className="slider-group">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={settings.audioEngine.masterVolume}
                                    onChange={(e) => updateSettings({
                                        audioEngine: { ...settings.audioEngine, masterVolume: parseFloat(e.target.value) },
                                    })}
                                />
                                <span>{Math.round(settings.audioEngine.masterVolume * 100)}%</span>
                            </div>
                        </div>

                        <div className="setting-row">
                            <span>Polyphony Limit</span>
                            <div className="slider-group">
                                <input
                                    type="range"
                                    min="0"
                                    max="32"
                                    step="1"
                                    value={settings.audioEngine.polyphonyLimit}
                                    onChange={(e) => updateSettings({
                                        audioEngine: { ...settings.audioEngine, polyphonyLimit: parseInt(e.target.value, 10) },
                                    })}
                                />
                                <span>{settings.audioEngine.polyphonyLimit === 0 ? '∞' : settings.audioEngine.polyphonyLimit}</span>
                            </div>
                        </div>

                        <div className="latency-buttons">
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
                    </section>
                )}
            </div>
        </div>
    );
}
