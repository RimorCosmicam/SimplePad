/**
 * SimplePad - Pad Config Entry Point
 * React application entry for pad configuration window
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { PadConfigWindow } from './windows/PadConfigWindow';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PadConfigWindow />
    </React.StrictMode>
);
