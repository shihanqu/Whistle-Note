import type { PitchResult } from '../utils/pitchDetection';

interface DebugOverlayProps {
    currentPitch: PitchResult | null;
    accuracy: number;
    stability: 'High' | 'Medium' | 'Low';
    notesCount: number;
    recordingDuration: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
    currentPitch,
    accuracy,
    stability,
    notesCount,
    recordingDuration
}) => {
    const getConfidenceClass = (confidence: number) => {
        if (confidence >= 0.8) return 'debug-overlay__value--good';
        if (confidence >= 0.6) return 'debug-overlay__value--warn';
        return 'debug-overlay__value--bad';
    };

    const getAccuracyClass = (acc: number) => {
        if (acc >= 90) return 'debug-overlay__value--good';
        if (acc >= 70) return 'debug-overlay__value--warn';
        return 'debug-overlay__value--bad';
    };

    return (
        <div className="debug-overlay">
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Frequency:</span>
                <span className="debug-overlay__value">
                    {currentPitch ? `${currentPitch.frequency.toFixed(2)} Hz` : '-- Hz'}
                </span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Note:</span>
                <span className="debug-overlay__value">
                    {currentPitch ? `${currentPitch.note}${currentPitch.octave}` : '--'}
                </span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Cents:</span>
                <span className="debug-overlay__value">
                    {currentPitch ? `${currentPitch.cents > 0 ? '+' : ''}${currentPitch.cents}` : '--'}
                </span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Confidence:</span>
                <span className={`debug-overlay__value ${currentPitch ? getConfidenceClass(currentPitch.confidence) : ''}`}>
                    {currentPitch ? `${(currentPitch.confidence * 100).toFixed(0)}%` : '--%'}
                </span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Accuracy:</span>
                <span className={`debug-overlay__value ${getAccuracyClass(accuracy)}`}>
                    {accuracy > 0 ? `${accuracy.toFixed(0)}%` : '--%'}
                </span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Stability:</span>
                <span className="debug-overlay__value">{stability}</span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Notes:</span>
                <span className="debug-overlay__value">{notesCount}</span>
            </div>
            <div className="debug-overlay__row">
                <span className="debug-overlay__label">Duration:</span>
                <span className="debug-overlay__value">{recordingDuration.toFixed(1)}s</span>
            </div>
        </div>
    );
};
