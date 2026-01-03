/**
 * SimplePad - About Panel
 * Credits and links displayed in sidebar
 */

import React from 'react';
import { useAppStore } from '../store/appStore';
import './SettingsPanel.css';

export function AboutPanel(): React.ReactElement {
    const closeSidebar = useAppStore((s) => s.closeSidebar);

    return (
        <div className="about-panel">
            {/* Header */}
            <header className="panel-header">
                <h2 className="panel-title">About</h2>
                <button className="btn btn-icon btn-ghost" onClick={closeSidebar} title="Close">
                    ✕
                </button>
            </header>

            {/* Content */}
            <div className="panel-content">
                <div className="about-content">
                    {/* App Info */}
                    <div className="about-app">
                        <div className="app-icon">🎹</div>
                        <h1 className="app-name">SimplePad</h1>
                        <p className="app-version">Version 1.0.0</p>
                        <p className="app-description">
                            A configurable soundboard with Apple Liquid Glass design for macOS.
                        </p>
                    </div>

                    {/* Credits */}
                    <section className="credits-section">
                        <h3>Created by</h3>
                        <a
                            href="https://www.threads.com/@judelawrosa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="credit-link author"
                        >
                            <span className="credit-icon">👤</span>
                            <span className="credit-name">@judelawrosa</span>
                            <span className="credit-platform">Threads</span>
                        </a>
                    </section>

                    <section className="credits-section">
                        <h3>Powered by</h3>
                        <div className="credits-list">
                            <a
                                href="https://www.electronjs.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">Electron</span>
                                <span className="credit-desc">Cross-platform desktop apps</span>
                            </a>
                            <a
                                href="https://github.com/nickcoad/electron-liquid-glass"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">electron-liquid-glass</span>
                                <span className="credit-desc">Native macOS glass effects</span>
                            </a>
                            <a
                                href="https://react.dev/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">React</span>
                                <span className="credit-desc">UI framework</span>
                            </a>
                            <a
                                href="https://wavesurfer.xyz/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">WaveSurfer.js</span>
                                <span className="credit-desc">Audio waveform visualization</span>
                            </a>
                            <a
                                href="https://github.com/yt-dlp/yt-dlp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">yt-dlp</span>
                                <span className="credit-desc">YouTube audio extraction</span>
                            </a>
                            <a
                                href="https://ffmpeg.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="credit-link"
                            >
                                <span className="credit-name">FFmpeg</span>
                                <span className="credit-desc">Audio processing</span>
                            </a>
                        </div>
                    </section>

                    {/* Copyright */}
                    <p className="copyright">
                        © {new Date().getFullYear()} All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
