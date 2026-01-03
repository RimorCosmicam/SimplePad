/**
 * SimplePad - IPC Handlers
 * Inter-process communication between main and renderer
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import {
    getSettings,
    saveSettings,
    getAllPads,
    getPad,
    savePad,
    deletePad
} from './store.js';
import { setGlassVariant } from './liquid-glass.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import crypto from 'crypto';
import ffmpegPath from 'ffmpeg-static';
import { YtDlp } from 'ytdlp-nodejs';
import type { AppSettings, PadConfig } from '../shared/types.js';

const execAsync = promisify(exec);

interface WindowContext {
    getMainWindow: () => BrowserWindow | null;
    getSettingsWindow: () => BrowserWindow | null;
    openSettingsWindow: () => void;
    openPadConfigWindow: (padId: string) => void;
    closeWindow: (window: BrowserWindow) => void;
    glassIds: Map<BrowserWindow, number>;
}

// ============================================================================
// Audio File Management
// ============================================================================

function getAudioStoragePath(): string {
    return path.join(app.getPath('userData'), 'audio');
}

async function ensureAudioDir(): Promise<void> {
    const dir = getAudioStoragePath();
    await fs.mkdir(dir, { recursive: true });
}

function generateAudioId(): string {
    return crypto.randomUUID();
}

// ============================================================================
// Register All Handlers
// ============================================================================

export function registerIPCHandlers(ctx: WindowContext): void {
    // -------------------------------------------------------------------------
    // Settings Handlers
    // -------------------------------------------------------------------------

    ipcMain.handle('settings:get', () => {
        return getSettings();
    });

    ipcMain.handle('settings:set', (_event, partialSettings: Partial<AppSettings>) => {
        const updated = saveSettings(partialSettings);

        // Broadcast to all windows
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('settings:changed', updated);
        });

        return updated;
    });

    // -------------------------------------------------------------------------
    // Pad Handlers
    // -------------------------------------------------------------------------

    ipcMain.handle('pad:get-all', () => {
        return getAllPads();
    });

    ipcMain.handle('pad:get', (_event, id: string) => {
        return getPad(id);
    });

    ipcMain.handle('pad:save', (_event, config: PadConfig) => {
        const pads = savePad(config);

        // Broadcast to all windows
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('pads:changed', pads);
        });

        return pads;
    });

    ipcMain.handle('pad:delete', (_event, id: string) => {
        const pads = deletePad(id);

        // Broadcast to all windows
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('pads:changed', pads);
        });

        return pads;
    });

    // -------------------------------------------------------------------------
    // Audio Handlers
    // -------------------------------------------------------------------------

    ipcMain.handle('audio:import-file', async () => {
        const mainWindow = ctx.getMainWindow();
        if (!mainWindow) return null;

        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'] },
            ],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const sourcePath = result.filePaths[0];
        const id = generateAudioId();
        const ext = path.extname(sourcePath);
        const destPath = path.join(getAudioStoragePath(), `${id}${ext}`);

        await ensureAudioDir();
        await fs.copyFile(sourcePath, destPath);

        return {
            id,
            path: destPath,
            name: path.basename(sourcePath),
        };
    });

    ipcMain.handle('audio:download-youtube', async (event, url: string) => {
        await ensureAudioDir();
        const id = generateAudioId();
        const outputPath = path.join(getAudioStoragePath(), `${id}.mp3`);

        try {
            // Use ytdlp-nodejs which auto-downloads and manages the yt-dlp binary
            const ytdlp = new YtDlp({
                ffmpegPath: ffmpegPath || undefined,
            });

            // Download audio and convert to mp3 with progress tracking
            await ytdlp.downloadAsync(url, {
                output: outputPath,
                format: {
                    filter: 'audioonly',
                    quality: 0, // Best quality (0 = best, 10 = worst)
                    type: 'mp3',
                },
                onProgress: (progress) => {
                    // Send progress to renderer
                    event.sender.send('youtube:download-progress', progress.percentage || 0);
                },
            });

            // Signal completion
            event.sender.send('youtube:download-progress', 100);

            return {
                id,
                path: outputPath,
            };
        } catch (error) {
            console.error('YouTube download failed:', error);
            throw new Error('Failed to download YouTube audio: ' + (error instanceof Error ? error.message : String(error)));
        }
    });

    ipcMain.handle('audio:get-buffer', async (_event, filePath: string) => {
        const buffer = await fs.readFile(filePath);
        return buffer.buffer;
    });

    ipcMain.handle('audio:process', async (
        _event,
        filePath: string,
        operation: string,
        params: Record<string, unknown>
    ) => {
        // Audio processing operations
        // These would use ffmpeg in production
        const ffmpegPath = 'ffmpeg'; // Could be bundled
        const id = generateAudioId();
        const outputPath = path.join(getAudioStoragePath(), `${id}_processed.mp3`);

        try {
            let cmd = '';

            switch (operation) {
                case 'trim': {
                    const start = params.start as number || 0;
                    const end = params.end as number;
                    const duration = end ? end - start : undefined;
                    cmd = `${ffmpegPath} -i "${filePath}" -ss ${start}${duration ? ` -t ${duration}` : ''} -c copy "${outputPath}"`;
                    break;
                }

                case 'fade': {
                    const fadeIn = params.fadeIn as number || 0;
                    const fadeOut = params.fadeOut as number || 0;
                    const duration = params.duration as number || 0;
                    const fadeOutStart = duration - fadeOut;
                    cmd = `${ffmpegPath} -i "${filePath}" -af "afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}" "${outputPath}"`;
                    break;
                }

                case 'normalize': {
                    // Two-pass or single pass loudnorm
                    cmd = `${ffmpegPath} -i "${filePath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "${outputPath}"`;
                    break;
                }

                case 'noise-reduce': {
                    // Using afftdn (An FFT-based denoiser)
                    cmd = `${ffmpegPath} -i "${filePath}" -af "afftdn=nr=12:nf=-25" "${outputPath}"`;
                    break;
                }

                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }

            if (cmd) {
                await execAsync(cmd);
            }

            return { success: true, path: outputPath };
        } catch (error) {
            console.error(`Audio processing failed (${operation}):`, error);
            throw error;
        }
    });

    // -------------------------------------------------------------------------
    // Window Handlers
    // -------------------------------------------------------------------------

    ipcMain.on('window:open-settings', () => {
        ctx.openSettingsWindow();
    });

    ipcMain.on('window:open-pad-config', (_event, padId: string) => {
        ctx.openPadConfigWindow(padId);
    });

    ipcMain.on('window:close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            ctx.closeWindow(win);
        }
    });

    // -------------------------------------------------------------------------
    // Glass Handlers
    // -------------------------------------------------------------------------

    ipcMain.on('glass:set-variant', (_event, variant: number) => {
        // Apply glass variant to the MAIN window, not the sender
        const mainWindow = ctx.getMainWindow();
        if (mainWindow) {
            const glassId = ctx.glassIds.get(mainWindow);
            if (glassId !== undefined) {
                setGlassVariant(glassId, variant);
            }
        }
    });

    // -------------------------------------------------------------------------
    // Project Management Handlers
    // -------------------------------------------------------------------------

    ipcMain.handle('project:save', async (_event, recordingBlob: ArrayBuffer | null) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Save Project',
                defaultPath: 'project.spad',
                filters: [{ name: 'SimplePad Project', extensions: ['spad'] }]
            });

            if (!filePath) return { success: false };

            const archiver = await import('archiver');
            const fsSync = await import('fs');

            const output = fsSync.createWriteStream(filePath);
            const archive = archiver.default('zip', { zlib: { level: 9 } });

            archive.pipe(output);

            // Add settings
            const settings = getSettings();
            archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' });

            // Add pads
            const pads = getAllPads();
            archive.append(JSON.stringify(pads, null, 2), { name: 'pads.json' });

            // Add audio files
            const audioDir = getAudioStoragePath();
            try {
                const files = await fs.readdir(audioDir);
                for (const file of files) {
                    const filePath = path.join(audioDir, file);
                    archive.file(filePath, { name: `audio/${file}` });
                }
            } catch { }

            // Add track recording if provided
            if (recordingBlob) {
                archive.append(Buffer.from(recordingBlob), { name: 'track-recording.webm' });
            }

            await archive.finalize();

            return { success: true, path: filePath };
        } catch (err) {
            console.error('Failed to save project:', err);
            return { success: false };
        }
    });

    ipcMain.handle('project:load', async () => {
        try {
            const { filePaths } = await dialog.showOpenDialog({
                title: 'Load Project',
                filters: [{ name: 'SimplePad Project', extensions: ['spad'] }],
                properties: ['openFile']
            });

            if (!filePaths || filePaths.length === 0) return null;

            const unzipper = await import('unzipper');
            const fsSync = await import('fs');

            const directory = await unzipper.Open.file(filePaths[0]);

            for (const file of directory.files) {
                if (file.path === 'settings.json') {
                    const content = await file.buffer();
                    const settings = JSON.parse(content.toString());
                    saveSettings(settings);
                } else if (file.path === 'pads.json') {
                    const content = await file.buffer();
                    const pads = JSON.parse(content.toString());
                    for (const pad of pads) {
                        savePad(pad);
                    }
                } else if (file.path.startsWith('audio/')) {
                    const audioDir = getAudioStoragePath();
                    await ensureAudioDir();
                    const destPath = path.join(audioDir, path.basename(file.path));
                    const content = await file.buffer();
                    await fs.writeFile(destPath, content);
                }
            }

            // Broadcast changes
            BrowserWindow.getAllWindows().forEach((win) => {
                win.webContents.send('settings:changed', getSettings());
                win.webContents.send('pads:changed', getAllPads());
            });

            return { success: true };
        } catch (err) {
            console.error('Failed to load project:', err);
            return { success: false };
        }
    });

    ipcMain.handle('project:export', async (_event, recordingBlob: ArrayBuffer, format: string, trackName: string) => {
        try {
            const { filePath } = await dialog.showSaveDialog({
                title: 'Export Recording',
                defaultPath: `${trackName || 'recording'}.${format}`,
                filters: [{ name: format.toUpperCase(), extensions: [format] }]
            });

            if (!filePath) return { success: false };

            // Save webm first
            const tempPath = path.join(app.getPath('temp'), `temp-recording-${Date.now()}.webm`);
            await fs.writeFile(tempPath, Buffer.from(recordingBlob));

            // Convert using bundled FFmpeg
            const ffmpeg = ffmpegPath || 'ffmpeg';
            await execAsync(`"${ffmpeg}" -i "${tempPath}" -y "${filePath}"`);

            // Clean up temp file
            await fs.unlink(tempPath).catch(() => { });

            return { success: true, path: filePath };
        } catch (err) {
            console.error('Failed to export recording:', err);
            return { success: false };
        }
    });
}
