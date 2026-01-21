import React from 'react';

interface AccuracyMeterProps {
    accuracy: number; // 0-100
}

function getAccuracyLevel(accuracy: number): string {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 70) return 'good';
    if (accuracy >= 50) return 'fair';
    return 'poor';
}

export const AccuracyMeter: React.FC<AccuracyMeterProps> = ({ accuracy }) => {
    const level = getAccuracyLevel(accuracy);

    return (
        <div className="accuracy-meter">
            <div
                className={`accuracy-meter__fill ${level}`}
                style={{ width: `${accuracy}%` }}
            />
        </div>
    );
};
