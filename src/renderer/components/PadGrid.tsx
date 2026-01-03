/**
 * SimplePad - Pad Grid Component
 * Renders a grid of pads that can be configured and triggered
 */

import React from 'react';
import { usePads, useDefaultPadTheme, useSettings } from '../store/appStore';
import { Pad } from './Pad';
import type { PadConfig } from '@shared/types';
import './PadGrid.css';

interface PadGridProps {
    rows: number;
    cols: number;
}

export function PadGrid({ rows, cols }: PadGridProps): React.ReactElement {
    const pads = usePads();
    const defaultTheme = useDefaultPadTheme();
    const settings = useSettings();
    const padSize = settings?.padSize ?? 100;

    // Create a map of existing pads by position
    const padMap = new Map<string, PadConfig>();
    pads.forEach((pad) => {
        const key = `${pad.row}-${pad.col}`;
        padMap.set(key, pad);
    });

    // Generate grid cells - NOT memoized to ensure theme updates trigger re-render
    const cells: React.ReactNode[] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const key = `${row}-${col}`;
            const existingPad = padMap.get(key);

            cells.push(
                <Pad
                    key={key}
                    row={row}
                    col={col}
                    config={existingPad || null}
                    defaultTheme={defaultTheme || null}
                />
            );
        }
    }

    return (
        <div
            className="pad-grid"
            style={{
                '--pad-size': `${padSize}px`,
                gridTemplateColumns: `repeat(${cols}, ${padSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${padSize}px)`,
            } as React.CSSProperties}
        >
            {cells}
        </div>
    );
}
