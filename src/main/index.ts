/**
 * SimplePad - Main Process Entry
 * Initializes the Electron application, manages windows, and sets up IPC
 */

import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import { createMainWindow, createSettingsWindow, createPadConfigWindow } from './windows.js';
import { registerIPCHandlers } from './ipc-handlers.js';
import { initStore } from './store.js';
import { applyGlassEffect } from './liquid-glass.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keep global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let padConfigWindow: BrowserWindow | null = null;
let currentPadConfigId: string | null = null;

// Glass effect IDs for each window
const glassIds: Map<BrowserWindow, number> = new Map();

// ============================================================================
// Window Management
// ============================================================================

function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}

function getSettingsWindow(): BrowserWindow | null {
    return settingsWindow;
}

function openSettingsWindow(): void {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    const store = initStore();
    const bounds = store.get('windowBounds.settings');
    settingsWindow = createSettingsWindow(bounds);

    settingsWindow.webContents.once('did-finish-load', () => {
        if (settingsWindow) {
            const glassId = applyGlassEffect(settingsWindow, {
                cornerRadius: 12,
                tintColor: '#00000020',
            });
            if (glassId !== null) {
                glassIds.set(settingsWindow, glassId);
            }
        }
    });

    settingsWindow.on('closed', () => {
        if (settingsWindow) {
            glassIds.delete(settingsWindow);
        }
        settingsWindow = null;
    });

    settingsWindow.on('moved', () => {
        if (settingsWindow) {
            store.set('windowBounds.settings', settingsWindow.getBounds());
        }
    });

    settingsWindow.on('resized', () => {
        if (settingsWindow) {
            store.set('windowBounds.settings', settingsWindow.getBounds());
        }
    });
}

function openPadConfigWindow(padId: string): void {
    if (padConfigWindow) {
        // If same pad, just focus
        if (currentPadConfigId === padId) {
            padConfigWindow.focus();
            return;
        }
        // Different pad, close and reopen
        padConfigWindow.close();
    }

    currentPadConfigId = padId;
    padConfigWindow = createPadConfigWindow(padId);

    padConfigWindow.webContents.once('did-finish-load', () => {
        if (padConfigWindow) {
            const glassId = applyGlassEffect(padConfigWindow, {
                cornerRadius: 12,
                tintColor: '#00000020',
            });
            if (glassId !== null) {
                glassIds.set(padConfigWindow, glassId);
            }
        }
    });

    padConfigWindow.on('closed', () => {
        if (padConfigWindow) {
            glassIds.delete(padConfigWindow);
        }
        padConfigWindow = null;
        currentPadConfigId = null;
    });
}

function closeWindow(window: BrowserWindow): void {
    window.close();
}

// ============================================================================
// App Lifecycle
// ============================================================================

async function createWindow(): Promise<void> {
    const store = initStore();
    const bounds = store.get('windowBounds.main');
    mainWindow = createMainWindow(bounds);

    // Apply glass effect after content loads
    mainWindow.webContents.once('did-finish-load', () => {
        if (mainWindow) {
            const fullSettings = store.get('settings');
            const glassConfig = fullSettings?.appBackground?.glass;

            const glassId = applyGlassEffect(mainWindow, {
                cornerRadius: glassConfig?.cornerRadius ?? 0,
                tintColor: glassConfig?.tintColor ?? '#00000010',
            });

            if (glassId !== null) {
                glassIds.set(mainWindow, glassId);

                // Apply variant if glass is enabled
                if (glassConfig?.enabled) {
                    import('./liquid-glass.js').then((mod) => {
                        mod.setGlassVariant(glassId, glassConfig.variant);
                    });
                }
            }
        }
    });

    mainWindow.on('closed', () => {
        if (mainWindow) {
            glassIds.delete(mainWindow);
        }
        mainWindow = null;
    });

    mainWindow.on('moved', () => {
        if (mainWindow) {
            store.set('windowBounds.main', mainWindow.getBounds());
        }
    });

    mainWindow.on('resized', () => {
        if (mainWindow) {
            store.set('windowBounds.main', mainWindow.getBounds());
        }
    });
}

app.whenReady().then(async () => {
    // Set up application menu with custom About
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: app.name,
            submenu: [
                {
                    label: 'About SimplePad',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About SimplePad',
                            message: 'SimplePad',
                            detail: `Version 1.0.0\n\nA modern soundpad with Liquid Glass design.\n\nCreated by @Judelawrosa\nwww.threads.com/@judelawrosa\n\nBuilt with Electron, React & TypeScript\n\n© 2026 SimplePad. All rights reserved.`,
                            buttons: ['OK', 'Open Threads'],
                            icon: path.join(__dirname, '../../resources/icon.iconset/icon_512x512.png')
                        }).then((result) => {
                            if (result.response === 1) {
                                shell.openExternal('https://www.threads.com/@judelawrosa');
                            }
                        });
                    }
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'warning',
                            title: 'New Project',
                            message: 'Create a new project?',
                            detail: 'This will clear all pads and settings. Make sure to save your current project first.',
                            buttons: ['Cancel', 'New Project'],
                            defaultId: 0,
                            cancelId: 0
                        }).then((result) => {
                            if (result.response === 1) {
                                // Clear all pads and reset settings
                                const store = initStore();
                                store.set('pads', []);
                                // Broadcast changes to all windows
                                BrowserWindow.getAllWindows().forEach((win) => {
                                    win.webContents.send('pads:changed', []);
                                });
                            }
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Save Project...',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow?.webContents.executeJavaScript(`
                            (async () => {
                                const trackRecorder = window.trackRecorder;
                                const blob = trackRecorder?.getRecordingBlob?.();
                                const arrayBuffer = blob ? await blob.arrayBuffer() : null;
                                await window.api.saveProject(arrayBuffer);
                            })();
                        `);
                    }
                },
                {
                    label: 'Open Project...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow?.webContents.executeJavaScript(`window.api.loadProject();`);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export Recording...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow?.webContents.executeJavaScript(`
                            (async () => {
                                const trackRecorder = window.trackRecorder;
                                const blob = trackRecorder?.getRecordingBlob?.();
                                if (!blob) {
                                    console.warn('No recording available');
                                    return;
                                }
                                const arrayBuffer = await blob.arrayBuffer();
                                const trackName = trackRecorder?.trackName || 'recording';
                                await window.api.exportRecording(arrayBuffer, 'mp3', trackName);
                            })();
                        `);
                    }
                }
            ]
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Follow @Judelawrosa on Threads',
                    click: () => shell.openExternal('https://www.threads.com/@judelawrosa')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Initialize IPC handlers
    registerIPCHandlers({
        getMainWindow,
        getSettingsWindow,
        openSettingsWindow,
        openPadConfigWindow,
        closeWindow,
        glassIds,
    });

    await createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle file associations and deep links if needed
app.on('open-file', (_event, filePath) => {
    // Could handle audio file drops here
    console.log('Open file:', filePath);
});
