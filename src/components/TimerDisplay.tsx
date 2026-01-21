import React from 'react';

interface TimerDisplayProps {
    durationSeconds: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ durationSeconds }) => {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    const deciseconds = Math.floor((durationSeconds % 1) * 10);

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return (
        <div className="timer">
            <div className="timer__display">
                {formattedMinutes}:{formattedSeconds}
                <span className="decimal">.{deciseconds}</span>
            </div>
        </div>
    );
};
