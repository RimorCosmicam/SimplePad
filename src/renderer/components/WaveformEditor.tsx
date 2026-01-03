/**
 * SimplePad - Waveform Editor (V2)
 * Advanced canvas-based waveform display with zoom, viewport management, and high-precision trim
 */

import React, { useEffect, useRef, useState } from 'react';
import './WaveformEditor.css';

interface WaveformEditorProps {
    audioPath: string;
    trimStart: number;
    trimEnd: number;
    onRegionChange: (start: number, end: number) => void;
}

export function WaveformEditor({
    audioPath,
    trimStart,
    trimEnd,
    onRegionChange,
}: WaveformEditorProps): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [audioData, setAudioData] = useState<Float32Array | null>(null);

    // Viewport management
    const [viewStart, setViewStart] = useState(0);
    const [viewEnd, setViewEnd] = useState(0);

    // Selection state
    const [localStart, setLocalStart] = useState(trimStart);
    const [localEnd, setLocalEnd] = useState(trimEnd);
    const [dragging, setDragging] = useState<'start' | 'end' | 'none'>('none');

    // Initial Load
    useEffect(() => {
        let cancelled = false;
        async function loadAudio() {
            setIsLoading(true);
            try {
                const buffer = await window.api.getAudioBuffer(audioPath);
                if (cancelled) return;

                const audioContext = new AudioContext();
                const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
                if (cancelled) return;

                const channelData = audioBuffer.getChannelData(0);
                setAudioData(channelData);
                setDuration(audioBuffer.duration);
                setViewEnd(audioBuffer.duration);

                if (trimEnd === 0) {
                    setLocalEnd(audioBuffer.duration);
                    onRegionChange(localStart, audioBuffer.duration);
                }

                audioContext.close();
                setIsLoading(false);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError('Failed to load audio');
                setIsLoading(false);
            }
        }
        loadAudio();
        return () => {
            cancelled = true;
        };
    }, [audioPath]);

    // Render Waveform
    useEffect(() => {
        if (!audioData || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        const visibleDuration = viewEnd - viewStart;
        if (visibleDuration <= 0) return;

        const startSample = Math.floor((viewStart / duration) * audioData.length);
        const endSample = Math.floor((viewEnd / duration) * audioData.length);
        const visibleSamples = audioData.subarray(startSample, endSample);

        const step = Math.ceil(visibleSamples.length / width);

        // Draw Waveform
        ctx.beginPath();
        ctx.strokeStyle = '#40A9FF';
        ctx.lineWidth = 1;

        for (let i = 0; i < width; i++) {
            const sampleIdx = i * step;
            let min = 0, max = 0;
            for (let j = 0; j < step; j++) {
                const val = visibleSamples[sampleIdx + j] || 0;
                if (val < min) min = val;
                if (val > max) max = val;
            }
            ctx.moveTo(i, centerY + min * centerY);
            ctx.lineTo(i, centerY + max * centerY);
        }
        ctx.stroke();

        // Draw Selection Overlay
        const selStartPx = ((localStart - viewStart) / visibleDuration) * width;
        const selEndPx = ((localEnd - viewStart) / visibleDuration) * width;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, Math.max(0, selStartPx), height);
        ctx.fillRect(selEndPx, 0, width - selEndPx, height);

        ctx.fillStyle = 'rgba(0, 122, 255, 0.4)';
        ctx.fillRect(selStartPx, 0, selEndPx - selStartPx, height);

        // Handles
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(selStartPx - 1, 0, 2, height);
        ctx.fillRect(selEndPx - 1, 0, 2, height);

    }, [audioData, duration, viewStart, viewEnd, localStart, localEnd]);

    const handleZoomToSelection = () => {
        setViewStart(localStart);
        setViewEnd(localEnd);
    };

    const handleZoomOut = () => {
        setViewStart(0);
        setViewEnd(duration);
    };

    const getTimeAtX = (x: number) => {
        if (!containerRef.current || duration === 0) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const visibleDuration = viewEnd - viewStart;
        return viewStart + (x / rect.width) * visibleDuration;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || duration === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = getTimeAtX(x);

        const hitSlop = (20 / rect.width) * (viewEnd - viewStart); // 20px hit area

        if (Math.abs(time - localStart) < hitSlop) {
            setDragging('start');
        } else if (Math.abs(time - localEnd) < hitSlop) {
            setDragging('end');
        } else {
            // Fallback to click-to-position if not hitting a handle
            if (Math.abs(time - localStart) < Math.abs(time - localEnd)) {
                const val = Math.max(0, Math.min(time, localEnd - 0.001));
                setLocalStart(val);
                onRegionChange(val, localEnd);
            } else {
                const val = Math.max(localStart + 0.001, Math.min(time, duration));
                setLocalEnd(val);
                onRegionChange(localStart, val);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging === 'none') {
            // Update cursor style
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const time = getTimeAtX(x);
                const hitSlop = (20 / rect.width) * (viewEnd - viewStart);

                if (Math.abs(time - localStart) < hitSlop || Math.abs(time - localEnd) < hitSlop) {
                    containerRef.current.style.cursor = 'ew-resize';
                } else {
                    containerRef.current.style.cursor = 'crosshair';
                }
            }
            return;
        }

        const rect = containerRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, Math.min(getTimeAtX(x), duration));

        if (dragging === 'start') {
            const val = Math.min(time, localEnd - 0.001);
            setLocalStart(val);
            onRegionChange(val, localEnd);
        } else {
            const val = Math.max(time, localStart + 0.001);
            setLocalEnd(val);
            onRegionChange(localStart, val);
        }
    };

    const handleMouseUp = () => setDragging('none');

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = (s % 60).toFixed(3);
        return `${m}:${sec.padStart(6, '0')}`;
    };

    if (isLoading) return <div className="waveform-v2-loading">Loading...</div>;
    if (error) return <div className="waveform-v2-error">{error}</div>;

    return (
        <div className="waveform-v2">
            <div
                className="waveform-v2-container"
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <canvas ref={canvasRef} />
            </div>
            <div className="waveform-v2-toolbar">
                <div className="time-info">
                    <span>{formatTime(localStart)}</span>
                    <span className="separator">|</span>
                    <span>{formatTime(localEnd)}</span>
                    <span className="duration">({(localEnd - localStart).toFixed(3)}s)</span>
                </div>
                <div className="zoom-controls">
                    <button className="btn-icon" onClick={handleZoomToSelection} title="Zoom to Selection">🔍+</button>
                    <button className="btn-icon" onClick={handleZoomOut} title="Reset Zoom">🔍-</button>
                </div>
            </div>
        </div>
    );
}
