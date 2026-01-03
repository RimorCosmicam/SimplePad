/**
 * SimplePad - Loop Recorder Component
 * Records audio output and creates playable loop slots
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../audio/engine';
import { useSettings } from '../store/appStore';
import './LoopRecorder.css';

interface RecordedLoop {
    id: number;
    buffer: AudioBuffer;
    isLooping: boolean;
}

export function LoopRecorder(): React.ReactElement {
    const [isRecording, setIsRecording] = useState(false);
    const [loops, setLoops] = useState<RecordedLoop[]>([]);
    const [activeLoopId, setActiveLoopId] = useState<number | null>(null);
    const settings = useSettings();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const loopSourcesRef = useRef<Map<number, AudioBufferSourceNode>>(new Map());

    // Start recording
    const startRecording = useCallback(async () => {
        const ctx = audioEngine.context;
        if (!ctx) return;

        try {
            // Create a MediaStreamDestination to capture audio
            const dest = ctx.createMediaStreamDestination();

            // Connect master gain to the destination for recording
            // We need to tap into the audio output
            const masterGain = (audioEngine as any).masterGain as GainNode;
            if (masterGain) {
                masterGain.connect(dest);
            }

            const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const arrayBuffer = await blob.arrayBuffer();

                try {
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    const newId = loops.length + 1;
                    setLoops(prev => [...prev, { id: newId, buffer: audioBuffer, isLooping: false }]);
                } catch (err) {
                    console.error('Failed to decode recorded audio:', err);
                }

                // Disconnect the recording tap
                if (masterGain) {
                    masterGain.disconnect(dest);
                }
            };

            recorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            console.log('LoopRecorder: Started recording');
        } catch (err) {
            console.error('LoopRecorder: Failed to start recording:', err);
        }
    }, [loops.length]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            console.log('LoopRecorder: Stopped recording');
        }
    }, []);

    // Play a loop once
    const playLoop = useCallback((loop: RecordedLoop) => {
        const ctx = audioEngine.context;
        if (!ctx) return;

        // Stop any existing playback of this loop
        const existingSource = loopSourcesRef.current.get(loop.id);
        if (existingSource) {
            try { existingSource.stop(); } catch { }
            loopSourcesRef.current.delete(loop.id);
        }

        const source = ctx.createBufferSource();
        source.buffer = loop.buffer;
        // Connect to masterGain so it's captured by track recording
        const masterGain = (audioEngine as any).masterGain as GainNode;
        source.connect(masterGain || ctx.destination);
        source.start();

        source.onended = () => {
            loopSourcesRef.current.delete(loop.id);
            if (activeLoopId === loop.id) {
                setActiveLoopId(null);
            }
        };

        loopSourcesRef.current.set(loop.id, source);
        setActiveLoopId(loop.id);
    }, [activeLoopId]);

    // Toggle loop playback
    const toggleLoopPlayback = useCallback((loop: RecordedLoop) => {
        const ctx = audioEngine.context;
        if (!ctx) return;

        const existingSource = loopSourcesRef.current.get(loop.id);

        // If currently looping this slot, stop it
        if (existingSource) {
            try { existingSource.stop(); } catch { }
            loopSourcesRef.current.delete(loop.id);
            setActiveLoopId(null);
            setLoops(prev => prev.map(l => l.id === loop.id ? { ...l, isLooping: false } : l));
            return;
        }

        // Start looping
        const source = ctx.createBufferSource();
        source.buffer = loop.buffer;
        source.loop = true;
        // Connect to masterGain so it's captured by track recording
        const masterGain = (audioEngine as any).masterGain as GainNode;
        source.connect(masterGain || ctx.destination);
        source.start();

        loopSourcesRef.current.set(loop.id, source);
        setActiveLoopId(loop.id);
        setLoops(prev => prev.map(l => l.id === loop.id ? { ...l, isLooping: true } : l));
    }, []);

    // Store refs for keybind handler
    const isRecordingRef = useRef(isRecording);
    isRecordingRef.current = isRecording;
    const startRecordingRef = useRef(startRecording);
    startRecordingRef.current = startRecording;
    const stopRecordingRef = useRef(stopRecording);
    stopRecordingRef.current = stopRecording;

    // Keyboard shortcuts (including loop record keybind)
    useEffect(() => {
        const loopRecordKeybind = settings?.keybinds?.loopRecord;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Check for loop record keybind first
            if (loopRecordKeybind) {
                let key = e.key.toLowerCase();
                if (e.key === ' ') key = 'space';

                if (key === loopRecordKeybind.toLowerCase()) {
                    e.preventDefault();
                    if (isRecordingRef.current) {
                        stopRecordingRef.current();
                    } else {
                        startRecordingRef.current();
                    }
                    return;
                }
            }

            const key = e.key;
            const num = parseInt(key, 10);

            // Determine loop index based on modifier keys
            let loopId: number | null = null;

            if (e.shiftKey && (e.metaKey || e.ctrlKey) && num >= 0 && num <= 9) {
                // Shift+Cmd+0-9 = loops 11-20
                loopId = 11 + num;
            } else if ((e.metaKey || e.ctrlKey) && num >= 0 && num <= 9) {
                // Cmd+0 = loop 10, Cmd+1-9 = loops 1-9
                loopId = num === 0 ? 10 : num;
            } else if (num >= 1 && num <= 9) {
                // Just number = play loop once
                const loop = loops.find(l => l.id === num);
                if (loop) {
                    e.preventDefault();
                    playLoop(loop);
                }
                return;
            }

            if (loopId !== null) {
                const loop = loops.find(l => l.id === loopId);
                if (loop) {
                    e.preventDefault();
                    toggleLoopPlayback(loop);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [loops, playLoop, toggleLoopPlayback, settings?.keybinds?.loopRecord]);

    return (
        <div className="loop-recorder">
            {/* Record Button */}
            <button
                className={`loop-record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
                {isRecording ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="3" width="10" height="10" rx="1" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="6" />
                    </svg>
                )}
            </button>

            {/* Loop Slots */}
            {loops.map(loop => (
                <button
                    key={loop.id}
                    className={`loop-slot-btn ${activeLoopId === loop.id ? 'active' : ''} ${loop.isLooping ? 'looping' : ''}`}
                    onClick={() => playLoop(loop)}
                    onDoubleClick={() => toggleLoopPlayback(loop)}
                    title={`Loop ${loop.id} - Click to play, Double-click or Cmd+${loop.id} to loop`}
                >
                    {loop.id}
                </button>
            ))}
        </div>
    );
}
