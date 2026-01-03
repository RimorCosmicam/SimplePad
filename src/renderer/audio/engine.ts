/**
 * SimplePad - Audio Engine
 * Low-latency audio playback using Web Audio API
 */

import type { AudioConfig, AppSettings } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface AudioSource {
    id: string;
    buffer: AudioBuffer;
    config: AudioConfig;
}

interface ActivePlayback {
    id: string;
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    panNode: StereoPannerNode;
    startTime: number;
    pauseTime?: number;
    baseOffset: number; // Seconds into buffer when play started
    nodes: {
        eq: { low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode };
        compressor: DynamicsCompressorNode;
        limiter: DynamicsCompressorNode;
        distortion: WaveShaperNode;
        bitcrusher: WaveShaperNode;
        reverbMix: GainNode;
        delayNode: DelayNode;
        delayFeedback: GainNode;
        delayMix: GainNode;
        chorusMix: GainNode;
        flangerMix: GainNode;
        phaserMix: GainNode;
        tremoloGain: GainNode;
        tremoloLFO: OscillatorNode;
        vibratoLFO: OscillatorNode;
        vibratoLFOGain: GainNode;
        exciterGain: GainNode; // Simple high-pass + gain exciter
    };
}

// ============================================================================
// Audio Engine Class
// ============================================================================

class AudioEngine {
    private _context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sources: Map<string, AudioSource> = new Map();
    private activePlayers: Map<string, ActivePlayback[]> = new Map();
    private polyphonyLimit: number = 0;
    private onPlayStateChange: ((padId: string, state: 'playing' | 'paused' | 'stopped') => void) | null = null;

    // Recording infrastructure
    private recordingDestination: MediaStreamAudioDestinationNode | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordingChunks: Blob[] = [];

    // ---------------------------------------------------------------------------
    // Properties
    // ---------------------------------------------------------------------------

    get context(): AudioContext | null {
        return this._context;
    }

    // ---------------------------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------------------------

    async initialize(settings: AppSettings['audioEngine']): Promise<void> {
        if (this._context) return;

        // Create context with low latency
        const latencyHint = settings?.latencyHint || 'interactive';

        try {
            this._context = new AudioContext({
                latencyHint,
            });
            console.log('AudioEngine: Initialized context');

            // Create master gain
            this.masterGain = this._context.createGain();
            this.masterGain.connect(this._context.destination);
            this.masterGain.gain.value = settings?.masterVolume ?? 1.0;

            this.polyphonyLimit = settings?.polyphonyLimit ?? 0;

            // Resume context if suspended (required by browsers)
            if (this._context.state === 'suspended') {
                await this._context.resume();
                console.log('AudioEngine: Context resumed');
            }
        } catch (err) {
            console.error('AudioEngine: Failed to initialize:', err);
        }
    }

    // ---------------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------------

    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                Math.max(0, Math.min(1, volume)),
                this._context?.currentTime ?? 0
            );
        }
    }

    setPolyphonyLimit(limit: number): void {
        this.polyphonyLimit = limit;
    }

    setPlayStateCallback(callback: (padId: string, state: 'playing' | 'paused' | 'stopped') => void): void {
        this.onPlayStateChange = callback;
    }

    // ---------------------------------------------------------------------------
    // Audio Loading
    // ---------------------------------------------------------------------------

    async loadAudio(padId: string, config: AudioConfig): Promise<void> {
        if (!this._context) {
            throw new Error('Audio engine not initialized');
        }

        try {
            // Check if we already have the buffer for this file path
            const existing = this.sources.get(padId);
            if (existing && existing.config.filePath === config.filePath) {
                // Just update the config
                existing.config = config;
                return;
            }

            // Get audio buffer from main process
            const arrayBuffer = await window.api.getAudioBuffer(config.filePath);
            const audioBuffer = await this._context.decodeAudioData(arrayBuffer);

            this.sources.set(padId, {
                id: padId,
                buffer: audioBuffer,
                config,
            });
        } catch (error) {
            console.error(`Failed to load audio for pad ${padId}:`, error);
            throw error;
        }
    }

    updateConfig(padId: string, config: AudioConfig): void {
        const source = this.sources.get(padId);
        if (source) {
            source.config = config;
            // Push real-time updates to active players
            const players = this.activePlayers.get(padId);
            if (players) {
                players.forEach(p => this.updatePlayerParameters(p, config));
            }
        }
    }

    private updatePlayerParameters(player: ActivePlayback, config: AudioConfig): void {
        if (!this._context) return;
        const now = this._context.currentTime;
        const nodes = player.nodes;

        // 1. Basic Parameters
        player.gainNode.gain.setTargetAtTime(config.volume ?? 1.0, now, 0.05);
        player.panNode.pan.setTargetAtTime(config.pan ?? 0, now, 0.05);

        // 2. Playback Speed
        player.source.playbackRate.setTargetAtTime(config.playbackRate ?? 1.0, now, 0.05);
        player.source.detune.setTargetAtTime(config.detune ?? 0, now, 0.05);

        // 3. Looping
        if (config.loop) {
            player.source.loop = true;
            player.source.loopStart = config.trimStart || 0;
            player.source.loopEnd = config.trimEnd || player.source.buffer?.duration || 0;
        } else {
            player.source.loop = false;
        }

        // 4. EQ
        nodes.eq.low.gain.setTargetAtTime(config.eq.low, now, 0.05);
        nodes.eq.mid.gain.setTargetAtTime(config.eq.mid, now, 0.05);
        nodes.eq.high.gain.setTargetAtTime(config.eq.high, now, 0.05);

        // 5. Dynamics
        if (config.compressor.enabled) {
            nodes.compressor.threshold.setTargetAtTime(config.compressor.threshold, now, 0.05);
            nodes.compressor.ratio.setTargetAtTime(config.compressor.ratio, now, 0.05);
            nodes.compressor.attack.setTargetAtTime(config.compressor.attack, now, 0.05);
            nodes.compressor.release.setTargetAtTime(config.compressor.release, now, 0.05);
        } else {
            nodes.compressor.ratio.setTargetAtTime(1, now, 0.05); // Bypass
        }

        if (config.limiter.enabled) {
            nodes.limiter.threshold.setTargetAtTime(config.limiter.threshold, now, 0.05);
            nodes.limiter.ratio.setTargetAtTime(20, now, 0.05);
        } else {
            nodes.limiter.ratio.setTargetAtTime(1, now, 0.05); // Bypass
        }

        // 6. Grit (Distortion/Bitcrusher)
        if (!config.distortion.enabled) {
            nodes.distortion.curve = null;
        } else {
            const amount = config.distortion.amount * 400;
            const curve = new Float32Array(4096);
            const deg = Math.PI / 180;
            for (let i = 0; i < 4096; i++) {
                const x = (i / 4095) * 2 - 1;
                curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
            }
            nodes.distortion.curve = curve;
        }

        if (!config.bitcrusher.enabled) {
            nodes.bitcrusher.curve = null;
        } else {
            const bits = config.bitcrusher.bits;
            const n = Math.pow(2, bits);
            const curve = new Float32Array(4096);
            for (let i = 0; i < 4096; i++) {
                const x = (i / 4095) * 2 - 1;
                curve[i] = Math.round(x * n) / n;
            }
            nodes.bitcrusher.curve = curve;
        }

        // 7. Time / Space / Modulation (Mix levels + Rates)
        nodes.reverbMix.gain.setTargetAtTime(config.reverb.enabled ? config.reverb.mix : 0, now, 0.05);

        nodes.delayMix.gain.setTargetAtTime(config.delay.enabled ? config.delay.mix : 0, now, 0.05);
        nodes.delayNode.delayTime.setTargetAtTime(config.delay.time, now, 0.05);
        nodes.delayFeedback.gain.setTargetAtTime(config.delay.feedback, now, 0.05);

        nodes.chorusMix.gain.setTargetAtTime(config.chorus.enabled ? config.chorus.mix : 0, now, 0.05);
        nodes.flangerMix.gain.setTargetAtTime(config.flanger.enabled ? config.flanger.mix : 0, now, 0.05);
        nodes.phaserMix.gain.setTargetAtTime(config.phaser.enabled ? config.phaser.mix : 0, now, 0.05);

        // 8. Oscillators
        if (config.tremolo.enabled) {
            nodes.tremoloLFO.frequency.setTargetAtTime(config.tremolo.rate, now, 0.05);
            nodes.tremoloGain.gain.setTargetAtTime(config.tremolo.depth, now, 0.05);
        } else {
            nodes.tremoloGain.gain.setTargetAtTime(0, now, 0.05);
        }

        if (config.vibrato.enabled) {
            nodes.vibratoLFO.frequency.setTargetAtTime(config.vibrato.rate, now, 0.05);
            nodes.vibratoLFOGain.gain.setTargetAtTime(config.vibrato.depth * 0.002, now, 0.05);
        } else {
            nodes.vibratoLFOGain.gain.setTargetAtTime(0, now, 0.05);
        }

        // 9. Exciter
        nodes.exciterGain.gain.setTargetAtTime(config.exciter.enabled ? config.exciter.amount : 0, now, 0.05);
    }

    unloadAudio(padId: string): void {
        this.stopPad(padId);
        this.sources.delete(padId);
    }

    isLoaded(padId: string): boolean {
        return this.sources.has(padId);
    }

    // ---------------------------------------------------------------------------
    // Playback control
    // ---------------------------------------------------------------------------

    playPad(padId: string, retriggerBehavior: 'restart' | 'stop' | 'layer' = 'layer', offset?: number, forceLoop?: boolean): void {
        console.log(`AudioEngine: playPad called for ${padId} (behavior: ${retriggerBehavior}, offset: ${offset}, forceLoop: ${forceLoop})`);
        if (!this._context || !this.masterGain) {
            console.warn('AudioEngine: Cannot play - not initialized');
            return;
        }

        const source = this.sources.get(padId);
        if (!source) {
            console.warn(`No audio loaded for pad ${padId}`);
            return;
        }

        const currentPlayers = this.activePlayers.get(padId) || [];

        // Handle retrigger behavior
        switch (retriggerBehavior) {
            case 'stop':
                if (currentPlayers.length > 0) {
                    this.stopPad(padId);
                    return;
                }
                break;
            case 'restart':
                this.stopPad(padId);
                break;
            case 'layer':
                if (this.polyphonyLimit > 0 && currentPlayers.length >= this.polyphonyLimit) {
                    const oldest = currentPlayers.shift();
                    if (oldest) this.fadeOutAndStop(oldest, 0.05);
                }
                break;
        }

        const { config, buffer } = source;
        const ctx = this._context;

        // Create source
        const bufNode = ctx.createBufferSource();
        bufNode.buffer = buffer;

        // Setup Looping & Trimming
        const startOffset = offset ?? (config.trimStart || 0);
        const endOffset = config.trimEnd || buffer.duration;
        const duration = Math.max(0, endOffset - startOffset);

        // Use forceLoop for sustain mode, otherwise use config.loop
        const shouldLoop = forceLoop ?? config.loop;
        if (shouldLoop) {
            bufNode.loop = true;
            bufNode.loopStart = config.trimStart || 0;
            bufNode.loopEnd = endOffset;
            console.log(`AudioEngine: Loop region set to ${bufNode.loopStart}s - ${bufNode.loopEnd}s (trimStart: ${config.trimStart}, trimEnd: ${config.trimEnd})`);
        }

        bufNode.playbackRate.value = config.playbackRate ?? 1.0;
        bufNode.detune.value = config.detune ?? 0;

        const gainNode = ctx.createGain();
        gainNode.gain.value = config.volume ?? 1.0;

        const panNode = ctx.createStereoPanner();
        panNode.pan.value = config.pan ?? 0;

        // Build Persistent Chain
        const { input, output, refs } = this.createChain();
        bufNode.connect(input);
        output.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(this.masterGain);

        // Fades
        if (config.fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, this._context.currentTime);
            gainNode.gain.linearRampToValueAtTime(config.volume ?? 1.0, this._context.currentTime + config.fadeInDuration);
        }

        // Start playback
        try {
            bufNode.start(0, startOffset, shouldLoop ? undefined : duration);
            console.log(`AudioEngine: Started playPad ${padId} at ${startOffset}s (looping: ${shouldLoop})`);
        } catch (err) {
            console.error(`AudioEngine: Failed to start playback for ${padId}:`, err);
        }

        const playback: ActivePlayback = {
            id: padId,
            source: bufNode,
            gainNode,
            panNode,
            startTime: ctx.currentTime,
            baseOffset: startOffset,
            nodes: refs,
        };

        const players = this.activePlayers.get(padId) || [];
        players.push(playback);
        this.activePlayers.set(padId, players);

        this.updatePlayerParameters(playback, config); // Apply initial parameters to all nodes
        this.onPlayStateChange?.(padId, 'playing');

        bufNode.onended = () => {
            this.removePlayback(padId, playback);
            if ((this.activePlayers.get(padId) || []).length === 0) {
                this.onPlayStateChange?.(padId, 'stopped');
            }
        };
    }

    pausePad(padId: string): void {
        const players = this.activePlayers.get(padId);
        if (!players) return;

        players.forEach(p => {
            if (!p.pauseTime) {
                p.pauseTime = this._context!.currentTime;
                try {
                    p.source.stop();
                } catch (e) {
                    // Source might have already stopped naturally
                }
            }
        });
        this.onPlayStateChange?.(padId, 'paused');
    }

    resumePad(padId: string): void {
        const players = this.activePlayers.get(padId);
        if (!players) return;

        // We need to create new sources for resumed playback
        // For simplicity, we'll stop existing paused ones and restart
        // A more robust solution might involve tracking multiple paused instances
        players.forEach(p => {
            if (p.pauseTime) {
                const elapsed = (p.pauseTime - p.startTime);
                const newOffset = p.baseOffset + elapsed;
                p.pauseTime = undefined; // Clear pause state
                this.playPad(padId, 'layer', newOffset); // Use 'layer' to allow multiple resumes
            }
        });
        // Remove the old paused players from active list
        this.activePlayers.set(padId, players.filter(p => !p.pauseTime));
        if ((this.activePlayers.get(padId) || []).length === 0) {
            this.onPlayStateChange?.(padId, 'stopped'); // If all were paused and now resumed, state is 'playing' from new sources
        }
    }

    stopPad(padId: string): void {
        const players = this.activePlayers.get(padId);
        if (!players) return;

        players.forEach(p => this.fadeOutAndStop(p, 0.05));
        this.activePlayers.delete(padId);
        this.onPlayStateChange?.(padId, 'stopped');
    }

    private createChain() {
        const ctx = this._context!;
        const input = ctx.createGain();
        let lastNode: AudioNode = input;

        const connect = (node: AudioNode) => {
            lastNode.connect(node);
            lastNode = node;
        };

        const bitcrusher = ctx.createWaveShaper();
        connect(bitcrusher);

        const distortion = ctx.createWaveShaper();
        connect(distortion);

        const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 320;
        const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000;
        const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 3200;
        connect(low); connect(mid); connect(high);

        const compressor = ctx.createDynamicsCompressor();
        connect(compressor);

        const limiter = ctx.createDynamicsCompressor();
        connect(limiter);

        // Vibrato (Frequency modulation) - tracking LFO for real-time updates
        const vibratoLFO = ctx.createOscillator();
        const vibratoLFOGain = ctx.createGain();
        vibratoLFO.connect(vibratoLFOGain);
        vibratoLFO.start(0);

        // Tremolo
        const tremoloGain = ctx.createGain();
        const tremoloLFO = ctx.createOscillator();
        const tremoloLFOGain = ctx.createGain();
        tremoloLFO.connect(tremoloLFOGain);
        tremoloLFOGain.connect(tremoloGain.gain);
        tremoloLFO.start(0);
        connect(tremoloGain);

        // Parallel Effects
        const delayNode = ctx.createDelay(5.0);
        const delayFeedback = ctx.createGain();
        delayFeedback.gain.value = 0; // Safe initial
        const delayMix = ctx.createGain();
        delayMix.gain.value = 0;

        lastNode.connect(delayNode);
        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(delayMix);

        const chorus = ctx.createDelay(0.1);
        const chorusMix = ctx.createGain(); chorus.connect(chorusMix);

        const flanger = ctx.createDelay(0.1);
        const flangerMix = ctx.createGain(); flanger.connect(flangerMix);

        const phaser = ctx.createBiquadFilter(); phaser.type = 'allpass';
        const phaserMix = ctx.createGain(); phaser.connect(phaserMix);

        const reverb = ctx.createDelay(0.1);
        const reverbMix = ctx.createGain(); reverb.connect(reverbMix);

        const exciterHP = ctx.createBiquadFilter(); exciterHP.type = 'highpass'; exciterHP.frequency.value = 3000;
        const exciterGain = ctx.createGain(); exciterHP.connect(exciterGain);

        lastNode.connect(chorus);
        lastNode.connect(flanger);
        lastNode.connect(phaser);
        lastNode.connect(reverb);
        lastNode.connect(exciterHP);

        const output = ctx.createGain();
        lastNode.connect(output);
        delayMix.connect(output);
        chorusMix.connect(output);
        flangerMix.connect(output);
        phaserMix.connect(output);
        reverbMix.connect(output);
        exciterGain.connect(output);

        return {
            input,
            output,
            refs: {
                eq: { low, mid, high },
                compressor,
                limiter,
                distortion,
                bitcrusher,
                reverbMix,
                delayNode,
                delayFeedback,
                delayMix,
                chorusMix,
                flangerMix,
                phaserMix,
                tremoloGain: tremoloLFOGain,
                tremoloLFO,
                vibratoLFO,
                vibratoLFOGain,
                exciterGain
            }
        };
    }

    stopAll(): void {
        this.activePlayers.forEach((_, padId) => this.stopPad(padId));
    }

    isPadPlaying(padId: string): boolean {
        const players = this.activePlayers.get(padId);
        return players ? players.some(p => !p.pauseTime) : false;
    }

    // ---------------------------------------------------------------------------
    // Private Helpers
    // ---------------------------------------------------------------------------

    private fadeOutAndStop(playback: ActivePlayback, duration: number): void {
        if (!this._context) return;

        const now = this._context.currentTime;
        playback.gainNode.gain.cancelScheduledValues(now);
        playback.gainNode.gain.setTargetAtTime(0, now, duration / 3); // Exponential fade out

        setTimeout(() => {
            try {
                playback.source.stop();
            } catch {
                // Already stopped
            }
            // Disconnect all nodes to free up resources
            playback.source.disconnect();
            playback.gainNode.disconnect();
            playback.panNode.disconnect();
            // Disconnect all nodes in the effect chain
            // This is a simplified approach; a more robust solution would track all connections
            // and disconnect them individually. For now, relying on garbage collection after source stops.
        }, duration * 1000 + 50); // Give a little extra time for fade to complete
    }

    private removePlayback(padId: string, playback: ActivePlayback): void {
        const players = this.activePlayers.get(padId);
        if (!players) return;

        const index = players.indexOf(playback);
        if (index >= 0) {
            players.splice(index, 1);
        }

        if (players.length === 0) {
            this.activePlayers.delete(padId);
        }
    }

    // ---------------------------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------------------------

    async dispose(): Promise<void> {
        this.stopAll();
        this.sources.clear();

        if (this._context) {
            await this._context.close();
            this._context = null;
        }
    }

    // ---------------------------------------------------------------------------
    // Recording Methods
    // ---------------------------------------------------------------------------

    startRecording(): boolean {
        if (!this._context || !this.masterGain) {
            console.warn('AudioEngine: Cannot start recording - not initialized');
            return false;
        }

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            console.warn('AudioEngine: Already recording');
            return false;
        }

        try {
            // Create recording destination and connect to master
            this.recordingDestination = this._context.createMediaStreamDestination();
            this.masterGain.connect(this.recordingDestination);

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, { mimeType: 'audio/webm' });
            this.recordingChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordingChunks.push(e.data);
                }
            };

            this.mediaRecorder.start(100);
            console.log('AudioEngine: Recording started');
            return true;
        } catch (err) {
            console.error('AudioEngine: Failed to start recording:', err);
            return false;
        }
    }

    stopRecording(): Promise<Blob | null> {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                console.warn('AudioEngine: Not recording');
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });

                // Disconnect recording destination
                if (this.masterGain && this.recordingDestination) {
                    try {
                        this.masterGain.disconnect(this.recordingDestination);
                    } catch { }
                }
                this.recordingDestination = null;
                this.recordingChunks = [];

                console.log('AudioEngine: Recording stopped, size:', blob.size);
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const audioEngine = new AudioEngine();
