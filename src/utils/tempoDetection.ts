/**
 * Tempo Detection Utilities
 * Intelligent BPM detection from audio onset strength
 */

export interface TempoResult {
    bpm: number;
    confidence: number;
    beats: number[];
}

export interface OnsetEvent {
    time: number;
    strength: number;
}

/**
 * Detect onsets (note attacks) in audio signal
 */
export function detectOnsets(
    audioBuffer: Float32Array,
    sampleRate: number,
    hopSize: number = 512
): OnsetEvent[] {
    const onsets: OnsetEvent[] = [];
    const frameSize = hopSize * 2;
    const numFrames = Math.floor((audioBuffer.length - frameSize) / hopSize);

    // Calculate spectral flux for each frame
    let prevSpectrum: Float32Array | null = null;
    const fluxValues: number[] = [];

    for (let i = 0; i < numFrames; i++) {
        const start = i * hopSize;
        const frame = audioBuffer.slice(start, start + frameSize);

        // Simple energy-based onset detection
        let energy = 0;
        for (let j = 0; j < frame.length; j++) {
            energy += frame[j] * frame[j];
        }
        energy = Math.sqrt(energy / frame.length);

        if (prevSpectrum !== null) {
            // Calculate spectral flux (difference from previous frame)
            let prevEnergy = 0;
            for (let j = 0; j < prevSpectrum.length; j++) {
                prevEnergy += prevSpectrum[j] * prevSpectrum[j];
            }
            prevEnergy = Math.sqrt(prevEnergy / prevSpectrum.length);

            const flux = Math.max(0, energy - prevEnergy);
            fluxValues.push(flux);
        }

        prevSpectrum = frame;
    }

    // Find peaks in flux curve (onsets)
    const threshold = calculateAdaptiveThreshold(fluxValues);

    for (let i = 1; i < fluxValues.length - 1; i++) {
        if (fluxValues[i] > fluxValues[i - 1] &&
            fluxValues[i] > fluxValues[i + 1] &&
            fluxValues[i] > threshold) {
            const time = (i * hopSize) / sampleRate;
            onsets.push({
                time,
                strength: fluxValues[i]
            });
        }
    }

    return onsets;
}

/**
 * Calculate adaptive threshold for onset detection
 */
function calculateAdaptiveThreshold(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return Math.max(median * 1.5, mean);
}

/**
 * Estimate tempo from onset times using autocorrelation
 */
export function estimateTempo(onsets: OnsetEvent[]): TempoResult | null {
    if (onsets.length < 4) {
        return null;
    }

    // Calculate inter-onset intervals (IOIs)
    const iois: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
        const ioi = onsets[i].time - onsets[i - 1].time;
        if (ioi > 0.1 && ioi < 2.0) { // Filter unreasonable intervals (30-600 BPM)
            iois.push(ioi);
        }
    }

    if (iois.length < 3) {
        return null;
    }

    // Create histogram of IOI values (quantized to BPM ranges)
    const bpmHistogram: Map<number, number> = new Map();

    for (const ioi of iois) {
        const bpm = Math.round(60 / ioi);

        // Consider the BPM and its multiples/subdivisions
        for (const multiplier of [0.5, 1, 2]) {
            const adjustedBpm = Math.round(bpm * multiplier);
            if (adjustedBpm >= 60 && adjustedBpm <= 200) {
                const currentCount = bpmHistogram.get(adjustedBpm) || 0;
                bpmHistogram.set(adjustedBpm, currentCount + 1);
            }
        }
    }

    // Find the most common BPM
    let bestBpm = 120;
    let maxCount = 0;

    for (const [bpm, count] of bpmHistogram.entries()) {
        if (count > maxCount) {
            maxCount = count;
            bestBpm = bpm;
        }
    }

    // Calculate confidence
    const totalVotes = Array.from(bpmHistogram.values()).reduce((a, b) => a + b, 0);
    const confidence = totalVotes > 0 ? maxCount / totalVotes : 0;

    // Extract beat positions
    const beatInterval = 60 / bestBpm;
    const beats: number[] = [];

    if (onsets.length > 0) {
        let beatTime = onsets[0].time;
        const endTime = onsets[onsets.length - 1].time;

        while (beatTime <= endTime) {
            beats.push(beatTime);
            beatTime += beatInterval;
        }
    }

    return {
        bpm: bestBpm,
        confidence,
        beats
    };
}

/**
 * Estimate tempo from note events (more accurate for melodic content)
 */
export function estimateTempoFromNotes(
    notes: Array<{ startTime: number; duration?: number }>
): TempoResult | null {
    if (notes.length < 4) {
        return null;
    }

    // Use note start times as onset times
    const onsets: OnsetEvent[] = notes.map(note => ({
        time: note.startTime,
        strength: 1
    }));

    return estimateTempo(onsets);
}

/**
 * Quantize a time value to the nearest beat subdivision
 */
export function quantizeToGrid(
    time: number,
    bpm: number,
    subdivision: number = 16 // 16th notes
): number {
    const beatDuration = 60 / bpm;
    const gridDuration = beatDuration / (subdivision / 4);

    return Math.round(time / gridDuration) * gridDuration;
}

/**
 * Convert duration to musical note value
 */
export function durationToNoteValue(
    durationSeconds: number,
    bpm: number
): { noteValue: string; dots: number } {
    const beatDuration = 60 / bpm;
    const ratio = durationSeconds / beatDuration;

    // Common note values relative to a quarter note
    const noteValues: Array<{ name: string; ratio: number }> = [
        { name: 'whole', ratio: 4 },
        { name: 'half', ratio: 2 },
        { name: 'quarter', ratio: 1 },
        { name: 'eighth', ratio: 0.5 },
        { name: 'sixteenth', ratio: 0.25 },
        { name: 'thirty-second', ratio: 0.125 }
    ];

    // Find closest note value
    let closestNote = noteValues[2]; // Default to quarter
    let minDiff = Infinity;

    for (const nv of noteValues) {
        // Check undotted
        const diff = Math.abs(ratio - nv.ratio);
        if (diff < minDiff) {
            minDiff = diff;
            closestNote = nv;
        }

        // Check dotted (1.5x duration)
        const dottedDiff = Math.abs(ratio - nv.ratio * 1.5);
        if (dottedDiff < minDiff) {
            minDiff = dottedDiff;
            closestNote = nv;
            return { noteValue: closestNote.name, dots: 1 };
        }
    }

    return { noteValue: closestNote.name, dots: 0 };
}
