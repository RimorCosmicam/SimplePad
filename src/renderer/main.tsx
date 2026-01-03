/**
 * SimplePad - Main Entry Point
 * React application entry for main window
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MainWindow } from './windows/MainWindow';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MainWindow />
    </React.StrictMode>
);
