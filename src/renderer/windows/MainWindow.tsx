/**
 * SimplePad - Main Window Component
 * Clean rebuild with working glass tint
 */

import React, { useEffect, useState } from 'react';
import { GlassSelect } from '../components/GlassSelect';
import type { AppSettings, PadConfig, ThemeConfig } from '@shared/types';
import { useAppStore, useSettings, useGridConfig, useSidebarView } from '../store/appStore';
import { PadGrid } from '../components/PadGrid';
import { LoopRecorder } from '../components/LoopRecorder';
import { TrackRecorder } from '../components/TrackRecorder';
import { audioEngine } from '../audio/engine';
import './MainWindow.css';

// Simple hex to rgba converter
function hexToRgba(hex: string, fallbackAlpha = 0.3): string {
    if (!hex || hex.length < 7) return 'transparent';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    let a = fallbackAlpha;
    if (hex.length === 9) {
        a = parseInt(hex.slice(7, 9), 16) / 255;
    }
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function MainWindow(): React.ReactElement {
    const [isLoading, setIsLoading] = useState(true);
    const initialize = useAppStore((s) => s.initialize);
    const settings = useSettings();
    const gridConfig = useGridConfig();
    const sidebarView = useSidebarView();
    const openSettings = useAppStore((s) => s.openSettings);
    const closeSidebar = useAppStore((s) => s.closeSidebar);
    const updateSettings = useAppStore((s) => s.updateSettings);

    // Initialize
    useEffect(() => {
        const init = async () => {
            await initialize();
            const s = useAppStore.getState().settings;
            if (s) {
                await audioEngine.initialize(s.audioEngine);
                audioEngine.setPlayStateCallback((padId, state) => {
                    useAppStore.getState().setPlaying(padId, state === 'playing');
                });
            }
            setIsLoading(false);
        };
        init();
        return () => { audioEngine.dispose(); };
    }, [initialize]);

    // Keyboard handling for pad playback - sustain mode (hold to play, release to stop)
    useEffect(() => {
        // Track key -> playback instance for proper polyphonic sustain
        const keyToPlaybackId = new Map<string, { padId: string; instanceId: string; holdMode: string }>();
        let instanceCounter = 0;

        const onKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const pressedKey = e.key.toLowerCase();

            // Prevent repeat events from retriggering (key held down)
            if (keyToPlaybackId.has(pressedKey)) {
                return;
            }

            const pads = useAppStore.getState().pads;

            // Find pad with matching key binding
            const targetPad = pads.find(p => {
                if (!p.keyBinding) return false;
                const bound = p.keyBinding.toLowerCase();
                return pressedKey === bound || (bound === 'space' && e.code === 'Space');
            });

            if (targetPad && targetPad.audio) {
                e.preventDefault();
                const instanceId = `${targetPad.id}-${++instanceCounter}`;
                const holdMode = targetPad.holdMode || 'continue';
                console.log(`[Sustain] KeyDown: ${pressedKey} -> pad ${targetPad.id} (holdMode: ${holdMode}, instance: ${instanceId})`);

                // Determine behavior based on holdMode:
                // 'continue' = loop while held, stop on release
                // 'loop' = single trigger, no hold tracking
                // 'none' = play once completely, ignore hold
                const forceLoop = holdMode === 'continue';
                audioEngine.playPad(targetPad.id, 'layer', undefined, forceLoop);

                // Track for keyup only if holdMode is 'continue' (sustain mode)
                if (holdMode === 'continue') {
                    keyToPlaybackId.set(pressedKey, { padId: targetPad.id, instanceId, holdMode });
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            const releasedKey = e.key.toLowerCase();
            const playback = keyToPlaybackId.get(releasedKey);

            if (playback) {
                console.log(`[Sustain] KeyUp: ${releasedKey} -> pad ${playback.padId} (holdMode: ${playback.holdMode})`);

                // Only stop if holdMode is 'continue' (sustain/loop while held)
                if (playback.holdMode === 'continue') {
                    audioEngine.stopPad(playback.padId);
                }
                keyToPlaybackId.delete(releasedKey);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    // Background settings
    const bg = settings?.appBackground;
    const glassEnabled = bg?.type === 'glass' && bg?.glass?.enabled;
    const tintEnabled = bg?.glass?.tintEnabled === true;
    const tintColor = bg?.glass?.tintColor || '#ffffff66';

    // Compute tint overlay style
    let overlayStyle: React.CSSProperties | undefined;
    if (glassEnabled && tintEnabled) {
        overlayStyle = { backgroundColor: hexToRgba(tintColor) };
    }

    const showTitle = settings?.showMainTitle ?? true;
    const isSidebarOpen = sidebarView === 'settings' || sidebarView === 'about';

    // Handlers for background settings
    const handleTintToggle = () => {
        if (!bg) return;
        updateSettings({
            appBackground: {
                ...bg,
                glass: { ...bg.glass, tintEnabled: !tintEnabled }
            }
        });
    };

    const handleTintColorChange = (color: string) => {
        if (!bg) return;
        updateSettings({
            appBackground: {
                ...bg,
                glass: { ...bg.glass, tintColor: color }
            }
        });
    };

    const handleVariantChange = (variant: number) => {
        if (!bg) return;
        updateSettings({
            appBackground: {
                ...bg,
                glass: { ...bg.glass, variant }
            }
        });
        window.api.setGlassVariant(variant);
    };

    if (isLoading) {
        return <div className="main-window loading"><div className="loading-spinner" /></div>;
    }

    // Compute window border style
    const borderWidth = bg?.glass?.borderWidth ?? 1;
    const borderColor = bg?.glass?.borderColor || '#ffffff40';
    const windowStyle: React.CSSProperties = {
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        borderRadius: bg?.glass?.cornerRadius ?? 12,
    };

    return (
        <div className="main-window" style={windowStyle}>
            {/* Tint overlay */}
            {overlayStyle && <div className="blur-overlay" style={overlayStyle} />}

            {/* Main area */}
            <div className="main-area">
                <header className={`titlebar drag-region ${!showTitle ? 'titlebar-minimal' : ''}`}>
                    <div className="titlebar-spacer" />
                    {showTitle && <h1 className="titlebar-title">SimplePad</h1>}
                    <button
                        className="btn btn-icon btn-ghost no-drag settings-btn"
                        onClick={() => isSidebarOpen ? closeSidebar() : openSettings()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </button>
                </header>

                {/* Track Recorder Section */}
                <div className="track-recorder-section no-drag">
                    <TrackRecorder />
                </div>

                <main className="main-content">
                    {gridConfig && <PadGrid rows={gridConfig.rows} cols={gridConfig.cols} />}
                    <div className="looper-section">
                        <span className="looper-label">Looper</span>
                        <LoopRecorder />
                    </div>
                </main>

                {/* Project Management Dropdown */}
                <div className="project-dropdown no-drag">
                    <GlassSelect
                        value=""
                        options={[
                            { value: 'save', label: '💾 Save Project' },
                            { value: 'load', label: '📂 Load Project' },
                            { value: 'export', label: '📤 Export Recording' }
                        ]}
                        onChange={async (action) => {
                            if (action === 'save') {
                                const trackRecorder = (window as any).trackRecorder;
                                const blob = trackRecorder?.getRecordingBlob?.();
                                const arrayBuffer = blob ? await blob.arrayBuffer() : null;
                                const result = await window.api.saveProject(arrayBuffer);
                                if (result.success) console.log('Project saved to:', result.path);
                            } else if (action === 'load') {
                                const result = await window.api.loadProject();
                                if (result?.success) console.log('Project loaded successfully');
                            } else if (action === 'export') {
                                const trackRecorder = (window as any).trackRecorder;
                                const blob = trackRecorder?.getRecordingBlob?.();
                                if (!blob) {
                                    console.warn('No recording available. Record a track first.');
                                    return;
                                }
                                // Default to mp3 - the save dialog will show file format options
                                const arrayBuffer = await blob.arrayBuffer();
                                const trackName = trackRecorder?.trackName || 'recording';
                                const result = await window.api.exportRecording(arrayBuffer, 'mp3', trackName);
                                if (result.success) console.log('Recording exported to:', result.path);
                            }
                        }}
                        title="Project options"
                    />
                </div>
            </div>

            {/* Settings Sidebar */}
            {isSidebarOpen && (
                <aside className="sidebar">
                    <header className="sidebar-header">
                        <h2>Settings</h2>
                        <button className="btn btn-ghost" onClick={closeSidebar}>✕</button>
                    </header>

                    <div className="sidebar-content">
                        {/* Glass Variant */}
                        <section className="settings-section">
                            <h3>Glass Variant</h3>
                            <div className="variant-grid">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19].map((v) => (
                                    <button
                                        key={v}
                                        className={`variant-btn ${bg?.glass?.variant === v ? 'active' : ''}`}
                                        onClick={() => handleVariantChange(v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Tint Settings */}
                        <section className="settings-section">
                            <h3>Background Tint</h3>

                            <div className="setting-row">
                                <span>Enable Tint</span>
                                <button
                                    className={`toggle ${tintEnabled ? 'active' : ''}`}
                                    onClick={handleTintToggle}
                                />
                            </div>

                            {tintEnabled && (
                                <>
                                    <div className="setting-row">
                                        <span>Color</span>
                                        <input
                                            type="color"
                                            value={tintColor.slice(0, 7)}
                                            onChange={(e) => handleTintColorChange(e.target.value + 'aa')}
                                        />
                                    </div>
                                </>
                            )}
                        </section>

                        {/* Window Border */}
                        <section className="settings-section">
                            <h3>Window Border</h3>
                            <div className="setting-row">
                                <span>Thickness: {bg?.glass?.borderWidth ?? 1}px</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="1"
                                    value={bg?.glass?.borderWidth ?? 1}
                                    onChange={(e) => {
                                        if (!bg) return;
                                        updateSettings({
                                            appBackground: {
                                                ...bg,
                                                glass: { ...bg.glass, borderWidth: parseInt(e.target.value) }
                                            }
                                        });
                                    }}
                                />
                            </div>
                            <div className="setting-row">
                                <span>Color</span>
                                <input
                                    type="color"
                                    value={(bg?.glass?.borderColor || '#ffffff').slice(0, 7)}
                                    onChange={(e) => {
                                        if (!bg) return;
                                        updateSettings({
                                            appBackground: {
                                                ...bg,
                                                glass: { ...bg.glass, borderColor: e.target.value + '40' }
                                            }
                                        });
                                    }}
                                />
                            </div>
                        </section>

                        {/* Grid Size */}
                        <section className="settings-section">
                            <h3>Grid Size</h3>
                            <div className="setting-row">
                                <span>Rows: {settings?.grid?.rows}</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="8"
                                    value={settings?.grid?.rows ?? 4}
                                    onChange={(e) => updateSettings({ grid: { rows: parseInt(e.target.value), cols: settings?.grid?.cols ?? 4 } })}
                                />
                            </div>
                            <div className="setting-row">
                                <span>Cols: {settings?.grid?.cols}</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="8"
                                    value={settings?.grid?.cols ?? 4}
                                    onChange={(e) => updateSettings({ grid: { rows: settings?.grid?.rows ?? 4, cols: parseInt(e.target.value) } })}
                                />
                            </div>
                        </section>

                        {/* Pad Shape */}
                        <section className="settings-section">
                            <h3>Pad Shape</h3>
                            <div className="setting-row">
                                <GlassSelect
                                    value={settings?.padShape ?? 'rounded'}
                                    options={[
                                        { value: 'square', label: 'Square' },
                                        { value: 'rounded', label: 'Rounded' },
                                        { value: 'circle', label: 'Circle' },
                                        { value: 'diamond', label: 'Diamond' },
                                        { value: 'hexagon', label: 'Hexagon' },
                                        { value: 'octagon', label: 'Octagon' },
                                        { value: 'triangle', label: 'Triangle' },
                                        { value: 'star', label: 'Star' },
                                        { value: 'heart', label: 'Heart' },
                                        { value: 'squircle', label: 'Squircle' }
                                    ]}
                                    onChange={(val) => updateSettings({ padShape: val as any })}
                                />
                            </div>
                        </section>

                        {/* App Settings */}
                        <section className="settings-section">
                            <h3>App Settings</h3>
                            <div className="setting-row">
                                <span>Show App Name</span>
                                <button
                                    className={`toggle ${showTitle ? 'active' : ''}`}
                                    onClick={() => updateSettings({ showMainTitle: !showTitle })}
                                />
                            </div>
                        </section>

                        {/* Keybinds */}
                        <KeybindsSection settings={settings} updateSettings={updateSettings} />
                    </div>
                </aside>
            )}
        </div>
    );
}

// Keybinds Section Component
function KeybindsSection({ settings, updateSettings }: { settings: AppSettings | null, updateSettings: (s: Partial<AppSettings>) => void }): React.ReactElement {
    const [listeningFor, setListeningFor] = useState<'trackRecord' | 'loopRecord' | null>(null);

    useEffect(() => {
        if (!listeningFor || !settings) return;

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
                updateSettings({
                    keybinds: { ...settings.keybinds, [listeningFor]: null },
                });
                setListeningFor(null);
                return;
            }

            updateSettings({
                keybinds: { ...settings.keybinds, [listeningFor]: key },
            });
            setListeningFor(null);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [listeningFor, settings, updateSettings]);

    if (!settings) return <></>;

    return (
        <section className="settings-section">
            <h3>Keybinds</h3>
            <div className="setting-row">
                <span>Track Record</span>
                <button
                    className={`keybind-btn ${listeningFor === 'trackRecord' ? 'listening' : ''}`}
                    onClick={() => setListeningFor(listeningFor === 'trackRecord' ? null : 'trackRecord')}
                >
                    {listeningFor === 'trackRecord' ? '...' : (settings.keybinds?.trackRecord?.toUpperCase() || '—')}
                </button>
            </div>
            <div className="setting-row">
                <span>Loop Record</span>
                <button
                    className={`keybind-btn ${listeningFor === 'loopRecord' ? 'listening' : ''}`}
                    onClick={() => setListeningFor(listeningFor === 'loopRecord' ? null : 'loopRecord')}
                >
                    {listeningFor === 'loopRecord' ? '...' : (settings.keybinds?.loopRecord?.toUpperCase() || '—')}
                </button>
            </div>
        </section>
    );
}
