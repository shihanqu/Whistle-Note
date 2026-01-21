import React, { useMemo } from 'react';

interface WaveformVisualizerProps {
    data: number[];
    isRecording: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
    data,
    isRecording
}) => {
    // Generate a subtle idle waveform when not recording or no data
    const displayData = useMemo(() => {
        if (data.length > 0 && isRecording) {
            return data;
        }
        // Generate subtle animated noise for idle state
        const idleData: number[] = [];
        const time = Date.now() / 1000;
        for (let i = 0; i < 50; i++) {
            const value = Math.sin(i * 0.3 + time * 2) * 0.02 +
                Math.sin(i * 0.7 + time * 1.5) * 0.01;
            idleData.push(value);
        }
        return idleData;
    }, [data, isRecording]);

    const pathData = useMemo(() => {
        const width = 360;
        const height = 50;
        const centerY = height / 2;
        const amplitude = height * 0.8;

        if (displayData.length === 0) {
            return {
                line: `M 0 ${centerY} L ${width} ${centerY}`,
                fill: `M 0 ${centerY} L ${width} ${centerY} L ${width} ${height} L 0 ${height} Z`
            };
        }

        const points: string[] = [];
        const fillPoints: string[] = [];
        const step = width / (displayData.length - 1);

        displayData.forEach((value, i) => {
            const x = i * step;
            const y = centerY - (value * amplitude);

            if (i === 0) {
                points.push(`M ${x} ${y}`);
                fillPoints.push(`M ${x} ${y}`);
            } else {
                const prevX = (i - 1) * step;
                const cpX = (prevX + x) / 2;
                points.push(`Q ${cpX} ${y} ${x} ${y}`);
                fillPoints.push(`Q ${cpX} ${y} ${x} ${y}`);
            }
        });

        fillPoints.push(`L ${width} ${height}`);
        fillPoints.push(`L 0 ${height}`);
        fillPoints.push('Z');

        return {
            line: points.join(' '),
            fill: fillPoints.join(' ')
        };
    }, [displayData]);

    return (
        <div className="waveform">
            <svg
                viewBox="0 0 360 50"
                preserveAspectRatio="none"
                className="waveform__svg"
            >
                <defs>
                    <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-primary-light)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--color-primary-light)" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Gradient fill */}
                <path
                    d={pathData.fill}
                    className="waveform__gradient-fill"
                    style={{
                        opacity: isRecording ? 0.4 : 0.15,
                    }}
                />

                {/* Line */}
                <path
                    d={pathData.line}
                    className="waveform__path"
                    style={{
                        opacity: isRecording ? 0.8 : 0.3,
                        strokeWidth: isRecording ? 2 : 1.5
                    }}
                />
            </svg>
        </div>
    );
};
