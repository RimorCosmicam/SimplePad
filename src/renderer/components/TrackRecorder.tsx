/**
 * SimplePad - Track Recorder Component
 * Records the full session output (all pads + loops)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { audioEngine } from '../audio/engine';
import { useSettings } from '../store/appStore';
import './TrackRecorder.css';

export function TrackRecorder(): React.ReactElement {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [trackName, setTrackName] = useState('Untitled Track');
    const [hasRecording, setHasRecording] = useState(false);
    const settings = useSettings();

    const recordingBlobRef = useRef<Blob | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);

    // Start recording using AudioEngine
    const startRecording = useCallback(() => {
        const success = audioEngine.startRecording();
        if (success) {
            setIsRecording(true);
            console.log('TrackRecorder: Started recording via AudioEngine');
        }
    }, []);

    // Stop recording using AudioEngine
    const stopRecording = useCallback(async () => {
        const blob = await audioEngine.stopRecording();
        if (blob) {
            recordingBlobRef.current = blob;
            setHasRecording(true);
            console.log('TrackRecorder: Recording saved, size:', blob.size);
        }
        setIsRecording(false);
    }, []);

    // Play the recording
    const playRecording = useCallback(() => {
        if (!recordingBlobRef.current) return;

        if (isPlaying && audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        const url = URL.createObjectURL(recordingBlobRef.current);
        const audio = new Audio(url);
        audioElementRef.current = audio;

        audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
        };

        audio.play();
        setIsPlaying(true);
    }, [isPlaying]);

    // Get recording blob (for export)
    const getRecordingBlob = useCallback(() => recordingBlobRef.current, []);

    // Expose for external use
    (window as any).trackRecorder = { getRecordingBlob, trackName };

    // Keybind listener
    const isRecordingRef = useRef(isRecording);
    isRecordingRef.current = isRecording;
    const startRecordingRef = useRef(startRecording);
    startRecordingRef.current = startRecording;
    const stopRecordingRef = useRef(stopRecording);
    stopRecordingRef.current = stopRecording;

    useEffect(() => {
        const keybind = settings?.keybinds?.trackRecord;
        if (!keybind) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            let key = e.key.toLowerCase();
            if (e.key === ' ') key = 'space';

            if (key === keybind.toLowerCase()) {
                e.preventDefault();
                if (isRecordingRef.current) {
                    stopRecordingRef.current();
                } else {
                    startRecordingRef.current();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings?.keybinds?.trackRecord]);

    return (
        <div className="track-recorder">
            <input
                type="text"
                className="track-name-input"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Track Name"
            />
            <button
                className={`track-record-btn ${isRecording ? 'recording' : ''} ${hasRecording ? 'has-recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                title="Records the full session output including all pads and loops"
            >
                {isRecording ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="3" width="10" height="10" rx="1" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="6" />
                    </svg>
                )}
            </button>
            {hasRecording && (
                <button
                    className={`track-play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={playRecording}
                    title="Play/Stop recording preview"
                >
                    {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="3" y="3" width="4" height="10" rx="1" />
                            <rect x="9" y="3" width="4" height="10" rx="1" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <polygon points="4,2 14,8 4,14" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}
