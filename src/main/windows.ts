/**
 * SimplePad - Window Factory
 * Creates and configures Electron windows for the application
 */

import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// Resolve paths based on dev or production
function getPreloadPath(): string {
    return path.join(__dirname, '../preload/index.js');
}

function getRendererURL(page: string): string {
    if (isDev) {
        return `http://localhost:5173/${page}`;
    }
    return `file://${path.join(__dirname, `../renderer/${page}`)}`;
}

// ============================================================================
// Window Configuration Defaults
// ============================================================================

const baseWindowConfig = {
    transparent: true,
    vibrancy: null as never, // Must NOT set vibrancy with liquid glass
    hasShadow: true,
    titleBarStyle: 'hiddenInset' as const,
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
        preload: getPreloadPath(),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need this for some native features
    },
};

// ============================================================================
// Window Factories
// ============================================================================

interface WindowBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function createMainWindow(savedBounds?: WindowBounds | null): BrowserWindow {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    const defaultWidth = 900;
    const defaultHeight = 700;

    const bounds = savedBounds || {
        x: Math.round((screenWidth - defaultWidth) / 2),
        y: Math.round((screenHeight - defaultHeight) / 2),
        width: defaultWidth,
        height: defaultHeight,
    };

    const win = new BrowserWindow({
        ...baseWindowConfig,
        ...bounds,
        minWidth: 400,
        minHeight: 300,
        show: false,
    });

    win.setWindowButtonVisibility(true);

    // Show window when ready to prevent flashing
    win.once('ready-to-show', () => {
        win.show();
    });

    win.loadURL(getRendererURL('index.html'));

    return win;
}

export function createSettingsWindow(savedBounds?: Partial<WindowBounds> | null): BrowserWindow {
    const defaultWidth = 500;
    const defaultHeight = 600;

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
        ...baseWindowConfig,
        width: savedBounds?.width ?? defaultWidth,
        height: savedBounds?.height ?? defaultHeight,
        minWidth: 400,
        minHeight: 500,
        show: false,
        title: 'Settings',
    };

    // Only set position if we have saved bounds
    if (savedBounds?.x !== undefined && savedBounds?.y !== undefined) {
        windowOptions.x = savedBounds.x;
        windowOptions.y = savedBounds.y;
    }

    const win = new BrowserWindow(windowOptions);

    win.setWindowButtonVisibility(true);

    win.once('ready-to-show', () => {
        win.show();
    });

    win.loadURL(getRendererURL('settings.html'));

    return win;
}

export function createPadConfigWindow(padId: string): BrowserWindow {
    const defaultWidth = 700;
    const defaultHeight = 650;

    const win = new BrowserWindow({
        ...baseWindowConfig,
        width: defaultWidth,
        height: defaultHeight,
        minWidth: 600,
        minHeight: 550,
        show: false,
        title: 'Configure Pad',
    });

    win.setWindowButtonVisibility(true);

    win.once('ready-to-show', () => {
        win.show();
    });

    // Pass padId as query parameter
    win.loadURL(getRendererURL(`padconfig.html?padId=${encodeURIComponent(padId)}`));

    return win;
}
