/**
 * SimplePad - Pad Config Panel (Sidebar)
 * Configure individual pad in sidebar instead of separate window
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore, usePads } from '../store/appStore';
import { WaveformEditor } from './WaveformEditor';
import { ThemeControls } from './ThemeControls';
import type { PadConfig, AudioConfig } from '@shared/types';
import './SettingsPanel.css';

type ConfigTab = 'audio' | 'theme';

function generatePadId(): string {
    return `pad-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PadConfigPanel(): React.ReactElement {
    const [activeTab, setActiveTab] = useState<ConfigTab>('audio');
    const editingPadId = useAppStore((s) => s.editingPadId);
    const pads = usePads();
    const updatePad = useAppStore((s) => s.updatePad);
    const closeSidebar = useAppStore((s) => s.closeSidebar);

    // Find or create pad config
    const existingPad = pads.find((p) => p.id === editingPadId);

    // Local state for editing
    const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
    const [audioPath, setAudioPath] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Initialize pad config
    useEffect(() => {
        if (existingPad) {
            setPadConfig(existingPad);
            setAudioPath(existingPad.audio?.filePath || null);
        } else if (editingPadId) {
            // Parse row/col from position ID
            const match = editingPadId.match(/^pad-(\d+)-(\d+)$/);
            let row = 0, col = 0;
            if (match) {
                row = parseInt(match[1], 10);
                col = parseInt(match[2], 10);
            }
            setPadConfig({
                id: generatePadId(),
                row,
                col,
                label: '',
                audio: null,
                theme: null,
                keyBinding: null,
                retriggerBehavior: 'restart',
            });
        }
    }, [editingPadId, existingPad]);

    // Import audio file
    const handleImportFile = useCallback(async () => {
        const result = await window.api.importAudioFile();
        if (result && padConfig) {
            setAudioPath(result.path);
            const audio: AudioConfig = {
                filePath: result.path,
                originalName: result.name,
                duration: 0,
                trimStart: 0,
                trimEnd: 0,
                fadeInDuration: 0,
                fadeOutDuration: 0,
                normalized: false,
                loop: false,
                volume: 1.0,
            };
            const updated = {
                ...padConfig,
                audio,
                label: padConfig.label || result.name.replace(/\.[^/.]+$/, ''),
            };
            setPadConfig(updated);
            updatePad(updated);
        }
    }, [padConfig, updatePad]);

    // YouTube download
    const handleYouTubeDownload = useCallback(async () => {
        if (!youtubeUrl.trim() || isDownloading || !padConfig) return;
        setIsDownloading(true);
        try {
            const result = await window.api.downloadYouTube(youtubeUrl, () => { });
            if (result) {
                setAudioPath(result.path);
                const audio: AudioConfig = {
                    filePath: result.path,
                    originalName: 'YouTube Audio',
                    duration: 0,
                    trimStart: 0,
                    trimEnd: 0,
                    fadeInDuration: 0,
                    fadeOutDuration: 0,
                    normalized: false,
                    loop: false,
                    volume: 1.0,
                };
                const updated = { ...padConfig, audio, label: padConfig.label || 'YouTube Audio' };
                setPadConfig(updated);
                updatePad(updated);
            }
            setYoutubeUrl('');
        } catch (error) {
            console.error('YouTube download failed:', error);
        } finally {
            setIsDownloading(false);
        }
    }, [youtubeUrl, isDownloading, padConfig, updatePad]);

    // Region change
    const handleRegionChange = useCallback((start: number, end: number, duration: number) => {
        if (!padConfig?.audio) return;
        const updated = {
            ...padConfig,
            audio: { ...padConfig.audio, duration, trimStart: start, trimEnd: end },
        };
        setPadConfig(updated);
        updatePad(updated);
    }, [padConfig, updatePad]);

    // Update pad property
    const updatePadProp = useCallback(<K extends keyof PadConfig>(key: K, value: PadConfig[K]) => {
        if (!padConfig) return;
        const updated = { ...padConfig, [key]: value };
        setPadConfig(updated);
        updatePad(updated);
    }, [padConfig, updatePad]);

    if (!padConfig) return <div className="padconfig-panel loading"><div className="loading-spinner" /></div>;

    return (
        <div className="padconfig-panel">
            {/* Header */}
            <header className="panel-header">
                <h2 className="panel-title">Configure Pad</h2>
                <button className="btn btn-icon btn-ghost" onClick={closeSidebar} title="Close">
                    ✕
                </button>
            </header>

            {/* Tabs */}
            <nav className="panel-tabs">
                <button className={`panel-tab ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
                    Audio
                </button>
                <button className={`panel-tab ${activeTab === 'theme' ? 'active' : ''}`} onClick={() => setActiveTab('theme')}>
                    Theme
                </button>
            </nav>

            {/* Content */}
            <div className="panel-content">
                {activeTab === 'audio' && (
                    <section className="panel-section">
                        {/* Label */}
                        <div className="setting-row">
                            <span>Label</span>
                            <input
                                type="text"
                                className="input"
                                value={padConfig.label}
                                onChange={(e) => updatePadProp('label', e.target.value)}
                                placeholder="Pad label..."
                            />
                        </div>

                        {/* Audio Source */}
                        <h3 className="section-title">Audio Source</h3>
                        <button className="btn btn-secondary" onClick={handleImportFile}>
                            📁 Import File
                        </button>
                        <div className="youtube-row">
                            <input
                                type="text"
                                className="input"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="YouTube URL..."
                                disabled={isDownloading}
                            />
                            <button className="btn btn-primary" onClick={handleYouTubeDownload} disabled={!youtubeUrl.trim() || isDownloading}>
                                {isDownloading ? '...' : '▶'}
                            </button>
                        </div>

                        {/* Waveform */}
                        {audioPath && (
                            <>
                                <WaveformEditor
                                    audioPath={audioPath}
                                    trimStart={padConfig.audio?.trimStart ?? 0}
                                    trimEnd={padConfig.audio?.trimEnd ?? 0}
                                    onRegionChange={handleRegionChange}
                                />

                                {/* Volume & Loop */}
                                <div className="setting-row">
                                    <span>Volume</span>
                                    <div className="slider-group">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={padConfig.audio?.volume ?? 1}
                                            onChange={(e) => {
                                                if (padConfig.audio) {
                                                    updatePadProp('audio', { ...padConfig.audio, volume: parseFloat(e.target.value) });
                                                }
                                            }}
                                        />
                                        <span>{Math.round((padConfig.audio?.volume ?? 1) * 100)}%</span>
                                    </div>
                                </div>

                                <div className="setting-row">
                                    <span>Loop</span>
                                    <button
                                        className={`toggle ${padConfig.audio?.loop ? 'active' : ''}`}
                                        onClick={() => {
                                            if (padConfig.audio) {
                                                updatePadProp('audio', { ...padConfig.audio, loop: !padConfig.audio.loop });
                                            }
                                        }}
                                    />
                                </div>

                                {/* Retrigger */}
                                <div className="setting-row">
                                    <span>Retrigger</span>
                                </div>
                                <div className="latency-buttons">
                                    {(['restart', 'stop', 'layer'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            className={`btn btn-secondary ${padConfig.retriggerBehavior === mode ? 'active' : ''}`}
                                            onClick={() => updatePadProp('retriggerBehavior', mode)}
                                        >
                                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                )}

                {activeTab === 'theme' && (
                    <section className="panel-section">
                        <div className="setting-row">
                            <span>Use Custom Theme</span>
                            <button
                                className={`toggle ${padConfig.theme !== null ? 'active' : ''}`}
                                onClick={() => {
                                    if (padConfig.theme === null) {
                                        updatePadProp('theme', {
                                            type: 'glass',
                                            solidColor: '#2d2d44',
                                            gradient: { angle: 180, stops: [{ color: '#434343', position: 0 }, { color: '#000000', position: 100 }] },
                                            imagePath: '',
                                            glass: { enabled: true, variant: 3, tintColor: '#ffffff15', tintEnabled: true, opacity: 0.6, cornerRadius: 16 },
                                        });
                                    } else {
                                        updatePadProp('theme', null);
                                    }
                                }}
                            />
                        </div>

                        {padConfig.theme && (
                            <ThemeControls
                                theme={padConfig.theme}
                                onChange={(theme) => updatePadProp('theme', theme)}
                                showGlassVariant
                            />
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
