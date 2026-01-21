/**
 * Pitch Detection Utilities
 * Uses autocorrelation-based algorithm for accurate melody extraction
 */

// Note frequencies (A5 = 880Hz reference for whistle tuning)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const REFERENCE_A5 = 880; // A5 = 880 Hz

export interface PitchResult {
    frequency: number;
    note: string;
    octave: number;
    cents: number; // How many cents off from perfect pitch (-50 to +50)
    confidence: number; // 0-1 confidence level
}

export interface NoteEvent {
    note: string;
    octave: number;
    frequency: number;
    startTime: number;
    endTime?: number;
    duration?: number;
    cents: number;
    confidence: number;
}

/**
 * Autocorrelation-based pitch detection
 * More accurate for monophonic sources like whistling and guitar
 * @param rmsThreshold - Minimum RMS level to detect pitch (sensitivity control)
 */
export function detectPitch(
    audioBuffer: Float32Array,
    sampleRate: number,
    rmsThreshold: number = 0.01
): PitchResult | null {
    const SIZE = audioBuffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);

    // Calculate RMS to check if there's enough signal
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += audioBuffer[i] * audioBuffer[i];
    }
    rms = Math.sqrt(rms / SIZE);

    // If signal is too quiet, return null
    if (rms < rmsThreshold) {
        return null;
    }

    // Autocorrelation
    const correlations = new Float32Array(MAX_SAMPLES);

    for (let lag = 0; lag < MAX_SAMPLES; lag++) {
        let correlation = 0;
        for (let i = 0; i < MAX_SAMPLES; i++) {
            correlation += audioBuffer[i] * audioBuffer[i + lag];
        }
        correlations[lag] = correlation;
    }

    // Normalize correlations by the zero-lag value
    const normFactor = correlations[0];
    if (normFactor === 0) return null;

    for (let i = 0; i < MAX_SAMPLES; i++) {
        correlations[i] /= normFactor;
    }

    // Find the first significant peak after the initial decline
    // For high-frequency detection (like whistling), we need smaller lags
    // minLag corresponds to max frequency, maxLag to min frequency
    const minLag = Math.floor(sampleRate / 3000); // Up to 3000 Hz for high whistles
    const maxLag = Math.floor(sampleRate / 50);   // Down to 50 Hz min

    // Find where correlation first drops below a threshold (end of initial peak)
    let hasDropped = false;
    const dropThreshold = 0.5;

    for (let lag = 1; lag < minLag; lag++) {
        if (correlations[lag] < dropThreshold) {
            hasDropped = true;
            break;
        }
    }

    // If we haven't found a drop, start from minLag
    const startLag = hasDropped ? minLag : Math.max(minLag, 10);

    // Find the FIRST peak that exceeds a threshold
    // This is crucial for avoiding octave errors
    let bestLag = 0;
    const peakThreshold = 0.3; // Minimum correlation to be considered a valid peak

    for (let lag = startLag; lag < Math.min(maxLag, MAX_SAMPLES - 1); lag++) {
        // Look for peaks: correlation is higher than neighbors
        if (correlations[lag] > correlations[lag - 1] &&
            correlations[lag] > correlations[lag + 1] &&
            correlations[lag] > peakThreshold) {
            bestLag = lag;
            break; // Take the FIRST peak, not the strongest
        }
    }

    if (bestLag === 0) {
        return null;
    }

    // Parabolic interpolation for sub-sample accuracy
    const y1 = correlations[bestLag - 1];
    const y2 = correlations[bestLag];
    const y3 = correlations[bestLag + 1];
    const a = (y1 + y3 - 2 * y2) / 2;
    const b = (y3 - y1) / 2;

    let refinedLag = bestLag;
    if (a !== 0) {
        refinedLag = bestLag - b / (2 * a);
    }

    const frequency = sampleRate / refinedLag;

    // Calculate confidence based on correlation strength at best lag
    // Since correlations are normalized, y2 is already between 0 and 1
    const confidence = Math.min(1, Math.max(0, y2));

    // Filter out unreasonable frequencies (allow up to 3000Hz for high whistles)
    if (frequency < 50 || frequency > 3000 || confidence < 0.3) {
        return null;
    }

    return frequencyToNote(frequency, confidence);
}

/**
 * Convert frequency to musical note
 * Using A5 = 880Hz as reference for whistle tuning
 */
export function frequencyToNote(frequency: number, confidence: number = 1): PitchResult {
    // A5 = 880Hz (one octave above standard A4)
    // This is better suited for whistle frequencies

    // Calculate semitones from A5
    const semitonesFromA5 = 12 * Math.log2(frequency / REFERENCE_A5);
    const roundedSemitones = Math.round(semitonesFromA5);

    // Calculate cents deviation
    const cents = Math.round((semitonesFromA5 - roundedSemitones) * 100);

    // Calculate note index (A = index 9 in NOTE_NAMES)
    // Normalize to 0-11 range
    const noteOffset = ((roundedSemitones % 12) + 12) % 12;
    const noteIndex = (9 + noteOffset) % 12; // 9 is A's position

    // Calculate octave (A5 is octave 5)
    const octave = 5 + Math.floor((roundedSemitones + 9) / 12);

    return {
        frequency,
        note: NOTE_NAMES[noteIndex],
        octave,
        cents,
        confidence
    };
}

/**
 * Get frequency from note name
 */
export function noteToFrequency(note: string, octave: number): number {
    const noteIndex = NOTE_NAMES.indexOf(note.toUpperCase());
    if (noteIndex === -1) return 0;

    // Calculate semitones from A5 (880 Hz)
    const A5_OCTAVE = 5;
    const A_INDEX = 9; // A is the 9th note in our array

    const semitonesFromA5 = (octave - A5_OCTAVE) * 12 + (noteIndex - A_INDEX);

    return REFERENCE_A5 * Math.pow(2, semitonesFromA5 / 12);
}

/**
 * Calculate pitch accuracy (0-100%)
 */
export function calculateAccuracy(cents: number): number {
    // Perfect pitch = 0 cents, worst = ±50 cents
    const accuracy = 100 - Math.abs(cents) * 2;
    return Math.max(0, Math.min(100, accuracy));
}

/**
 * Determine pitch stability based on recent readings
 */
export function calculateStability(recentPitches: PitchResult[]): 'High' | 'Medium' | 'Low' {
    if (recentPitches.length < 5) return 'Low';

    // Calculate variance in cents
    const centsValues = recentPitches.map(p => p.cents);
    const mean = centsValues.reduce((a, b) => a + b, 0) / centsValues.length;
    const variance = centsValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / centsValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 5) return 'High';
    if (stdDev < 15) return 'Medium';
    return 'Low';
}
