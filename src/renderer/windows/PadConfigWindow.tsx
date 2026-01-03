/**
 * SimplePad - Pad Configuration Window (REBUILT)
 * Professional-grade audio editor with 20+ real-time effects
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { WaveformEditor } from '../components/WaveformEditor';
import { ThemeControls } from '../components/ThemeControls';
import { audioEngine } from '../audio/engine';
import { GlassSelect } from '../components/GlassSelect';
import type { PadConfig, AudioConfig, ThemeConfig } from '@shared/types';
import './PadConfigWindow.css';

type ConfigTab = 'general' | 'dynamics' | 'eq' | 'modulation' | 'time' | 'harmonics' | 'output' | 'theme';

export function PadConfigWindow(): React.ReactElement {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ConfigTab>('general');
    const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
    const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
    const [previewLoop, setPreviewLoop] = useState(false);
    const [isListeningForKey, setIsListeningForKey] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const initialize = useAppStore((s) => s.initialize);
    const updatePad = useAppStore((s) => s.updatePad);

    const createDefaultAudioConfig = useCallback((filePath: string, name: string): AudioConfig => ({
        filePath,
        originalName: name,
        duration: 0,
        trimStart: 0,
        trimEnd: 0,
        fadeInDuration: 0.1,
        fadeOutDuration: 0.1,
        normalized: false,
        loop: false,
        volume: 1.0,
        pan: 0,
        playbackRate: 1.0,
        detune: 0,
        eq: { enabled: true, low: 0, mid: 0, high: 0 },
        compressor: { enabled: false, threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        limiter: { enabled: false, threshold: -1 },
        deEsser: { enabled: false, frequency: 6000, amount: 0.5 },
        distortion: { enabled: false, amount: 0.5 },
        tremolo: { enabled: false, rate: 5, depth: 0.5 },
        vibrato: { enabled: false, rate: 5, depth: 0.5 },
        bitcrusher: { enabled: false, bits: 8, normfreq: 0.1 },
        reverb: { enabled: false, mix: 0.3, roomSize: 0.5 },
        delay: { enabled: false, mix: 0.3, time: 0.4, feedback: 0.4 },
        chorus: { enabled: false, mix: 0.3, rate: 1.5, depth: 0.5 },
        flanger: { enabled: false, mix: 0.3, rate: 0.5, depth: 0.5, feedback: 0.5 },
        phaser: { enabled: false, mix: 0.3, rate: 0.5, depth: 0.5 },
        noiseReduction: { enabled: false, amount: 0.5 },
        exciter: { enabled: false, amount: 0.5 }
    }), []);

    const hydrateAudioConfig = useCallback((config: AudioConfig): AudioConfig => {
        const defaults = createDefaultAudioConfig(config.filePath, config.originalName);
        return {
            ...defaults,
            ...config,
            reverb: { ...defaults.reverb, ...(config.reverb || {}) },
            delay: { ...defaults.delay, ...(config.delay || {}) },
            chorus: { ...defaults.chorus, ...(config.chorus || {}) },
            flanger: { ...defaults.flanger, ...(config.flanger || {}) },
            phaser: { ...defaults.phaser, ...(config.phaser || {}) },
            eq: { ...defaults.eq, ...(config.eq || {}) },
            compressor: { ...defaults.compressor, ...(config.compressor || {}) },
            limiter: { ...defaults.limiter, ...(config.limiter || {}) },
            deEsser: { ...defaults.deEsser, ...(config.deEsser || {}) },
            distortion: { ...defaults.distortion, ...(config.distortion || {}) },
            tremolo: { ...defaults.tremolo, ...(config.tremolo || {}) },
            vibrato: { ...defaults.vibrato, ...(config.vibrato || {}) },
            bitcrusher: { ...defaults.bitcrusher, ...(config.bitcrusher || {}) },
            exciter: { ...defaults.exciter, ...(config.exciter || {}) },
            noiseReduction: { ...defaults.noiseReduction, ...(config.noiseReduction || {}) },
        };
    }, [createDefaultAudioConfig]);

    const handlePlay = useCallback(async () => {
        if (!padConfig?.audio) return;

        console.log('UI: handlePlay triggered for pad:', padConfig.id);

        try {
            // Defensive initialization just in case background init failed
            if (!audioEngine.context) {
                console.log('UI: AudioEngine not initialized, starting init...');
                const settings = await initialize();
                await audioEngine.initialize(settings?.audioEngine || {
                    polyphonyLimit: 0,
                    masterVolume: 1.0,
                    latencyHint: 'interactive'
                });
            }

            if (audioEngine.context?.state === 'suspended') {
                console.log('UI: Resuming suspended AudioContext');
                await audioEngine.context.resume();
            }

            if (playbackState === 'paused') {
                audioEngine.resumePad(padConfig.id);
                return;
            }

            const config = { ...padConfig.audio, loop: previewLoop };
            if (!audioEngine.isLoaded(padConfig.id)) {
                console.log('UI: Loading audio for pad:', padConfig.id);
                await audioEngine.loadAudio(padConfig.id, config);
            }
            audioEngine.updateConfig(padConfig.id, config);
            audioEngine.playPad(padConfig.id, padConfig.retriggerBehavior || 'layer');
        } catch (err) {
            console.error('Playback failed:', err);
        }
    }, [padConfig, playbackState, previewLoop, initialize]);

    const handlePause = useCallback(() => {
        if (padConfig) {
            audioEngine.pausePad(padConfig.id);
        }
    }, [padConfig]);

    const handleStop = useCallback(() => {
        if (padConfig) {
            audioEngine.stopPad(padConfig.id);
        }
    }, [padConfig]);

    const updateAudio = useCallback((updates: Partial<AudioConfig>) => {
        setPadConfig(prev => {
            if (!prev || !prev.audio) return prev;
            const updated = { ...prev.audio, ...updates };
            if (audioEngine.isLoaded(prev.id)) {
                audioEngine.updateConfig(prev.id, updated);
            }
            return { ...prev, audio: updated };
        });
    }, []);

    // Global listener for key capture when in "Listening" mode
    useEffect(() => {
        if (!isListeningForKey) return;

        const handleCapture = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            let key = e.key.toLowerCase();
            if (e.key === ' ') key = 'space';
            if (e.key === 'Backspace' || e.key === 'Delete') key = '';

            console.log('UI: Captured key:', key);
            setPadConfig(prev => {
                if (!prev) return null;
                const updated = { ...prev, keyBinding: key };
                updatePad(updated); // Sync to store/main window immediately
                return updated;
            });
            setIsListeningForKey(false);
        };

        window.addEventListener('keydown', handleCapture, true);
        return () => window.removeEventListener('keydown', handleCapture, true);
    }, [isListeningForKey]);

    const handlePlayRef = useRef(handlePlay);
    handlePlayRef.current = handlePlay;

    useEffect(() => {
        const init = async () => {
            const settings = await initialize();
            if (settings?.audioEngine) {
                await audioEngine.initialize(settings.audioEngine);
            } else {
                // Fallback to defaults if settings are missing
                await audioEngine.initialize({
                    polyphonyLimit: 0,
                    masterVolume: 1.0,
                    latencyHint: 'interactive'
                });
            }

            const urlPadId = window.api.getPadIdFromQuery();
            if (urlPadId) {
                const existingPad = await window.api.getPad(urlPadId);
                if (existingPad) {
                    if (existingPad.audio) {
                        existingPad.audio = hydrateAudioConfig(existingPad.audio);
                        setPreviewLoop(existingPad.audio.loop);
                    }
                    setPadConfig(existingPad);
                } else {
                    // New pad - create default config
                    // Parse row/col from padId (format: pad-row-col)
                    const parts = urlPadId.split('-');
                    const row = parseInt(parts[1], 10) || 0;
                    const col = parseInt(parts[2], 10) || 0;
                    setPadConfig({
                        id: urlPadId,
                        row,
                        col,
                        label: '',
                        keyBinding: '',
                        retriggerBehavior: 'layer',
                        holdMode: 'loop',
                        theme: null,
                        audio: null,
                    });
                }
            }
            setIsLoading(false);
        };
        init();

        audioEngine.setPlayStateCallback((_, state) => {
            console.log('UI: Playback state changed to:', state);
            setPlaybackState(state);
        });

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (!(e.target as HTMLElement).classList.contains('key-input')) {
                    return;
                }
            }
            if (e.code === 'Space') {
                e.preventDefault();
                handlePlayRef.current();
            } else if (padConfig?.keyBinding) {
                const keyPressed = e.key.toLowerCase();
                const boundKey = padConfig.keyBinding.toLowerCase();
                if (keyPressed === boundKey || (boundKey === 'space' && e.code === 'Space')) {
                    e.preventDefault();
                    handlePlayRef.current();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            audioEngine.stopAll();
            audioEngine.setPlayStateCallback(() => { });
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [initialize, hydrateAudioConfig, padConfig?.keyBinding]);

    useEffect(() => {
        if (padConfig?.id && playbackState === 'playing') {
            audioEngine.updateConfig(padConfig.id, { ...padConfig.audio!, loop: previewLoop });
        }
    }, [previewLoop, playbackState, padConfig]);

    const handleSave = async () => {
        if (padConfig) {
            await updatePad(padConfig);
            window.api.closeWindow();
        }
    };

    if (isLoading || !padConfig) return <div className="padconfig-loading">Loading Pad Settings...</div>;

    const needsAudio = activeTab !== 'general' && activeTab !== 'theme' && !padConfig.audio;

    return (
        <div className="padconfig-v2">
            <header className="padconfig-v2-header">
                <div className="title-group">
                    <span className="window-label">Pad Controller</span>
                    <input
                        className="pad-name-input"
                        value={padConfig.label}
                        onChange={(e) => setPadConfig({ ...padConfig, label: e.target.value })}
                        placeholder="Unnamed Pad"
                    />
                </div>
                <div className="shortcut-box">
                    <span className="box-label">Key Binding</span>
                    <div
                        className={`key-binding-cap ${isListeningForKey ? 'listening' : ''}`}
                        onClick={() => setIsListeningForKey(!isListeningForKey)}
                        title="Click here, then press any key to bind it to this pad"
                    >
                        {isListeningForKey ? 'Listening...' : (padConfig.keyBinding?.toUpperCase() || 'None')}
                    </div>
                </div>
            </header>

            <div className="padconfig-v2-top">
                {padConfig.audio ? (
                    <div className="pinned-waveform">
                        <WaveformEditor
                            audioPath={padConfig.audio.filePath}
                            trimStart={padConfig.audio.trimStart}
                            trimEnd={padConfig.audio.trimEnd}
                            onRegionChange={(start, end) => updateAudio({ trimStart: start, trimEnd: end })}
                        />
                        <div className="transport-bar">
                            <div className="transport-group">
                                <button
                                    className={`btn-transport ${playbackState === 'playing' ? 'active' : ''}`}
                                    onClick={handlePlay}
                                    title="Play"
                                >
                                    ▶
                                </button>
                                <button
                                    className={`btn-transport ${playbackState === 'paused' ? 'active' : ''}`}
                                    onClick={handlePause}
                                    title="Pause"
                                >
                                    ⏸
                                </button>
                                <button
                                    className="btn-transport"
                                    onClick={handleStop}
                                    title="Stop"
                                >
                                    ⏹
                                </button>
                            </div>
                            <div className="mac-toggle-row">
                                <label className="mac-switch">
                                    <input type="checkbox" checked={previewLoop} onChange={e => setPreviewLoop(e.target.checked)} />
                                    <span className="mac-slider"></span>
                                </label>
                                <span className="toggle-label">Loop Selection</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="no-audio-state">
                        <p>No audio loaded for this pad.</p>
                        <button className="btn-primary" onClick={async () => {
                            const res = await window.api.importAudioFile();
                            if (res) {
                                const newConfig = createDefaultAudioConfig(res.path, res.name);
                                setPadConfig(prev => prev ? { ...prev, label: res.name, audio: newConfig } : null);
                            }
                        }}>Load Audio File</button>
                    </div>
                )}
            </div>

            <div className="padconfig-v2-main">
                <nav className="padconfig-v2-sidebar">
                    <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>General</button>
                    <button className={activeTab === 'dynamics' ? 'active' : ''} onClick={() => setActiveTab('dynamics')}>Dynamics</button>
                    <button className={activeTab === 'eq' ? 'active' : ''} onClick={() => setActiveTab('eq')}>EQ / Filter</button>
                    <button className={activeTab === 'modulation' ? 'active' : ''} onClick={() => setActiveTab('modulation')}>Modulation</button>
                    <button className={activeTab === 'time' ? 'active' : ''} onClick={() => setActiveTab('time')}>Time / Space</button>
                    <button className={activeTab === 'harmonics' ? 'active' : ''} onClick={() => setActiveTab('harmonics')}>Grit</button>
                    <button className={activeTab === 'output' ? 'active' : ''} onClick={() => setActiveTab('output')}>Output</button>
                    <button className={activeTab === 'theme' ? 'active' : ''} onClick={() => setActiveTab('theme')}>Theme</button>
                </nav>

                <section className="padconfig-v2-content">
                    {needsAudio ? (
                        <div className="audio-required-pane">
                            <h3>Audio Required</h3>
                            <p>Please load an audio file in the General tab or at the top to configure these effects.</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'general' && (
                                <div className="tab-pane">
                                    <div className="source-actions">
                                        <button className="btn-secondary" title="Change the current audio file" onClick={async () => {
                                            const res = await window.api.importAudioFile();
                                            if (res) {
                                                if (padConfig.audio) {
                                                    updateAudio({ filePath: res.path, originalName: res.name });
                                                } else {
                                                    const newConfig = createDefaultAudioConfig(res.path, res.name);
                                                    setPadConfig(prev => prev ? { ...prev, label: res.name, audio: newConfig } : null);
                                                }
                                            }
                                        }}>{padConfig.audio ? 'Change File' : 'Load File'}</button>
                                    </div>
                                    <div className="youtube-download-row">
                                        <input
                                            type="text"
                                            className="youtube-url-input"
                                            placeholder="Paste YouTube URL here..."
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            disabled={isDownloading}
                                        />
                                        <button
                                            className={`btn-secondary youtube-download-btn ${isDownloading ? 'downloading' : ''}`}
                                            disabled={!youtubeUrl.trim() || isDownloading}
                                            style={isDownloading ? {
                                                background: `linear-gradient(to right, rgba(0, 122, 255, 0.6) ${downloadProgress}%, rgba(255, 255, 255, 0.08) ${downloadProgress}%)`
                                            } : undefined}
                                            onClick={async () => {
                                                if (!youtubeUrl.trim()) return;
                                                setIsDownloading(true);
                                                setDownloadProgress(0);
                                                try {
                                                    const result = await window.api.downloadYouTube(youtubeUrl, (progress) => {
                                                        setDownloadProgress(progress);
                                                    });
                                                    if (padConfig.audio) {
                                                        updateAudio({ filePath: result.path, originalName: 'YouTube Download' });
                                                    } else {
                                                        const newConfig = createDefaultAudioConfig(result.path, 'YouTube Download');
                                                        setPadConfig(prev => prev ? { ...prev, label: prev.label || 'YouTube Download', audio: newConfig } : null);
                                                    }
                                                    setYoutubeUrl('');
                                                } catch (err) {
                                                    alert('Download failed: ' + err);
                                                } finally {
                                                    setIsDownloading(false);
                                                    setDownloadProgress(0);
                                                }
                                            }}
                                        >
                                            {isDownloading ? `${Math.round(downloadProgress)}%` : 'Download'}
                                        </button>
                                    </div>

                                    <div className="setting-row-v2">
                                        <div className="shortcut-box">
                                            <span className="box-label">Retrigger Mode</span>
                                            <GlassSelect
                                                title="Set how the pad behaves when triggered while already playing"
                                                value={padConfig.retriggerBehavior || 'layer'}
                                                options={[
                                                    { value: 'layer', label: 'Layer (Overlapping)' },
                                                    { value: 'restart', label: 'Restart (Cutoff)' },
                                                    { value: 'stop', label: 'Toggle (Play/Stop)' }
                                                ]}
                                                onChange={(val) => setPadConfig(prev => prev ? { ...prev, retriggerBehavior: val as any } : null)}
                                            />
                                        </div>
                                        <div className="shortcut-box">
                                            <span className="box-label">Hold Mode</span>
                                            <GlassSelect
                                                title="Set how the pad behaves when a key is held down"
                                                value={padConfig.holdMode || 'continue'}
                                                options={[
                                                    { value: 'continue', label: 'Continue (Loop While Held)' },
                                                    { value: 'loop', label: 'Loop (Single Trigger)' },
                                                    { value: 'none', label: 'None (Play Once, Ignore Hold)' }
                                                ]}
                                                onChange={(val) => setPadConfig(prev => prev ? { ...prev, holdMode: val as any } : null)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'dynamics' && padConfig.audio && (
                                <div className="tab-pane list">
                                    <div className="effect-card" title="Reduces the volume of loud sounds to keep the level consistent">
                                        <div className="card-header">
                                            <label>Compressor</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.compressor.enabled} onChange={e => updateAudio({ compressor: { ...padConfig.audio!.compressor, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Thresh</label>
                                                <input type="range" title="The volume level where compression starts" min="-60" max="0" value={padConfig.audio.compressor.threshold} onChange={e => updateAudio({ compressor: { ...padConfig.audio!.compressor, threshold: Number(e.target.value) } })} />
                                                <span>{padConfig.audio.compressor.threshold}dB</span>
                                            </div>
                                            <div className="slider-row">
                                                <label>Ratio</label>
                                                <input type="range" title="How much the volume is reduced once it passes the threshold" min="1" max="20" value={padConfig.audio.compressor.ratio} onChange={e => updateAudio({ compressor: { ...padConfig.audio!.compressor, ratio: Number(e.target.value) } })} />
                                                <span>{padConfig.audio.compressor.ratio}:1</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="effect-card" title="Ensures the volume never passes a specific limit (hard ceiling)">
                                        <div className="card-header">
                                            <label>Limiter</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.limiter.enabled} onChange={e => updateAudio({ limiter: { ...padConfig.audio!.limiter, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Ceiling</label>
                                                <input type="range" title="The maximum peak volume allowed" min="-20" max="0" step="0.1" value={padConfig.audio.limiter.threshold} onChange={e => updateAudio({ limiter: { ...padConfig.audio!.limiter, threshold: Number(e.target.value) } })} />
                                                <span>{padConfig.audio.limiter.threshold}dB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'eq' && padConfig.audio && (
                                <div className="tab-pane">
                                    <div className="eq-group">
                                        <div className="slider-v-container" title="Adjust high frequencies (brilliance/air)">
                                            <label>High</label>
                                            <input type="range" className="slider-v" min="-12" max="12" value={padConfig.audio.eq.high} onChange={e => updateAudio({ eq: { ...padConfig.audio!.eq, high: Number(e.target.value) } })} />
                                            <span>{padConfig.audio.eq.high}</span>
                                        </div>
                                        <div className="slider-v-container" title="Adjust middle frequencies (clarity/presence)">
                                            <label>Mid</label>
                                            <input type="range" className="slider-v" min="-12" max="12" value={padConfig.audio.eq.mid} onChange={e => updateAudio({ eq: { ...padConfig.audio!.eq, mid: Number(e.target.value) } })} />
                                            <span>{padConfig.audio.eq.mid}</span>
                                        </div>
                                        <div className="slider-v-container" title="Adjust low frequencies (bass/thump)">
                                            <label>Low</label>
                                            <input type="range" className="slider-v" min="-12" max="12" value={padConfig.audio.eq.low} onChange={e => updateAudio({ eq: { ...padConfig.audio!.eq, low: Number(e.target.value) } })} />
                                            <span>{padConfig.audio.eq.low}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'modulation' && padConfig.audio && (
                                <div className="tab-pane list">
                                    <div className="effect-card" title="Adds richness and depth by layering slightly detuned copies">
                                        <div className="card-header">
                                            <label>Chorus</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.chorus.enabled} onChange={e => updateAudio({ chorus: { ...padConfig.audio!.chorus, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Mix</label>
                                                <input type="range" title="Dry/Wet balance" min="0" max="1" step="0.01" value={padConfig.audio.chorus.mix} onChange={e => updateAudio({ chorus: { ...padConfig.audio!.chorus, mix: Number(e.target.value) } })} />
                                            </div>
                                            <div className="slider-row">
                                                <label>Rate</label>
                                                <input type="range" title="Speed of the effect modulation" min="0.1" max="10" step="0.1" value={padConfig.audio.chorus.rate} onChange={e => updateAudio({ chorus: { ...padConfig.audio!.chorus, rate: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="effect-card" title="Adds rhythmic volume fluctuations">
                                        <div className="card-header">
                                            <label>Tremolo</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.tremolo.enabled} onChange={e => updateAudio({ tremolo: { ...padConfig.audio!.tremolo, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Rate</label>
                                                <input type="range" title="Speed of the volume pulses" min="0.1" max="20" step="0.1" value={padConfig.audio.tremolo.rate} onChange={e => updateAudio({ tremolo: { ...padConfig.audio!.tremolo, rate: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="effect-card" title="Creates a swirling metallic effect">
                                        <div className="card-header">
                                            <label>Flanger</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.flanger.enabled} onChange={e => updateAudio({ flanger: { ...padConfig.audio!.flanger, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Feedback</label>
                                                <input type="range" title="Intensity of the resonance" min="0" max="0.9" step="0.01" value={padConfig.audio.flanger.feedback} onChange={e => updateAudio({ flanger: { ...padConfig.audio!.flanger, feedback: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'time' && padConfig.audio && (
                                <div className="tab-pane list">
                                    <div className="effect-card" title="Adds echoes/repeats to the sound">
                                        <div className="card-header">
                                            <label>Delay / Echo</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.delay.enabled} onChange={e => updateAudio({ delay: { ...padConfig.audio!.delay, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Time</label>
                                                <input type="range" title="Time between repeats (seconds)" min="0" max="2" step="0.01" value={padConfig.audio.delay.time} onChange={e => updateAudio({ delay: { ...padConfig.audio!.delay, time: Number(e.target.value) } })} />
                                            </div>
                                            <div className="slider-row">
                                                <label>Feedback</label>
                                                <input type="range" title="Number of repeats" min="0" max="0.95" step="0.01" value={padConfig.audio.delay.feedback} onChange={e => updateAudio({ delay: { ...padConfig.audio!.delay, feedback: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="effect-card" title="Simulates the sound reflecting off the walls of a room">
                                        <div className="card-header">
                                            <label>Reverb</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.reverb.enabled} onChange={e => updateAudio({ reverb: { ...padConfig.audio!.reverb, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Mix</label>
                                                <input type="range" title="Amount of room space effect" min="0" max="1" step="0.01" value={padConfig.audio.reverb.mix} onChange={e => updateAudio({ reverb: { ...padConfig.audio!.reverb, mix: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'harmonics' && padConfig.audio && (
                                <div className="tab-pane list">
                                    <div className="effect-card" title="Adds gritty, saturated character by clipping the signal">
                                        <div className="card-header">
                                            <label>Distortion</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.distortion.enabled} onChange={e => updateAudio({ distortion: { ...padConfig.audio!.distortion, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Amount</label>
                                                <input type="range" title="Intensity of the grit" min="0" max="1" step="0.01" value={padConfig.audio.distortion.amount} onChange={e => updateAudio({ distortion: { ...padConfig.audio!.distortion, amount: Number(e.target.value) } })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="effect-card" title="Reduces digital resolution for a lo-fi/retro effect">
                                        <div className="card-header">
                                            <label>Bitcrusher</label>
                                            <label className="mac-switch">
                                                <input type="checkbox" checked={padConfig.audio.bitcrusher.enabled} onChange={e => updateAudio({ bitcrusher: { ...padConfig.audio!.bitcrusher, enabled: e.target.checked } })} />
                                                <span className="mac-slider"></span>
                                            </label>
                                        </div>
                                        <div className="card-content">
                                            <div className="slider-row">
                                                <label>Bits</label>
                                                <input type="range" title="Higher = Clearer, Lower = More crushed/lo-fi" min="1" max="16" step="1" value={padConfig.audio.bitcrusher.bits} onChange={e => updateAudio({ bitcrusher: { ...padConfig.audio!.bitcrusher, bits: Number(e.target.value) } })} />
                                                <span>{padConfig.audio.bitcrusher.bits}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'output' && padConfig.audio && (
                                <div className="tab-pane">
                                    <div className="slider-row large" title="Adjust the output volume of this pad">
                                        <label>Master Volume</label>
                                        <input type="range" min="0" max="1.5" step="0.01" value={padConfig.audio.volume} onChange={e => updateAudio({ volume: Number(e.target.value) })} />
                                        <span>{(padConfig.audio.volume * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="slider-row large" title="Position the sound in the stereo field (Left/Right)">
                                        <label>Stereo Pan</label>
                                        <input type="range" min="-1" max="1" step="0.01" value={padConfig.audio.pan} onChange={e => updateAudio({ pan: Number(e.target.value) })} />
                                        <span>{padConfig.audio.pan.toFixed(2)}</span>
                                    </div>
                                    <div className="slider-row large" title="Adjust the pitch of the sound in semitones (-12 to +12)">
                                        <label>Pitch</label>
                                        <input type="range" min="-1200" max="1200" step="100" value={padConfig.audio.detune} onChange={e => updateAudio({ detune: Number(e.target.value) })} />
                                        <span>{(padConfig.audio.detune / 100).toFixed(0)} st</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'theme' && (
                                <div className="tab-pane">
                                    <ThemeControls
                                        theme={padConfig.theme || createDefaultTheme()}
                                        onChange={t => setPadConfig({ ...padConfig, theme: t })}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>

            <footer className="padconfig-v2-footer">
                <div className="footer-actions">
                    <button className="btn-secondary" onClick={() => window.api.closeWindow()}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Apply Changes</button>
                </div>
            </footer>
        </div>
    );
}

function createDefaultTheme(): ThemeConfig {
    return {
        type: 'glass',
        solidColor: '#4c4c4c',
        gradient: { angle: 135, stops: [] },
        imagePath: '',
        glass: { enabled: true, variant: 0, tintColor: '#ffffff', tintEnabled: true, opacity: 0.6, cornerRadius: 16 }
    };
}
