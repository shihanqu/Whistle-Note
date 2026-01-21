/**
 * Key Detection using Krumhansl-Schmuckler Algorithm
 * Analyzes the distribution of notes to determine the musical key
 */

// Krumhansl-Kessler key profiles
// These represent the expected distribution of pitch classes in major and minor keys
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface KeyResult {
    key: string;
    mode: 'major' | 'minor';
    confidence: number;
    alternates: Array<{ key: string; mode: 'major' | 'minor'; correlation: number }>;
}

/**
 * Rotate an array by n positions
 */
function rotateArray<T>(arr: T[], n: number): T[] {
    const len = arr.length;
    const rotation = ((n % len) + len) % len;
    return [...arr.slice(rotation), ...arr.slice(0, rotation)];
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

/**
 * Detect the musical key from a collection of notes
 * Uses the Krumhansl-Schmuckler algorithm
 */
export function detectKey(notes: Array<{ note: string; duration?: number }>): KeyResult | null {
    if (notes.length < 4) {
        return null;
    }

    // Build pitch class histogram (weighted by duration if available)
    const pitchClassCounts = new Array(12).fill(0);

    for (const noteEvent of notes) {
        const noteIndex = NOTE_NAMES.indexOf(noteEvent.note);
        if (noteIndex !== -1) {
            const weight = noteEvent.duration || 1;
            pitchClassCounts[noteIndex] += weight;
        }
    }

    // Normalize the histogram
    const total = pitchClassCounts.reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const normalizedCounts = pitchClassCounts.map(c => c / total);

    // Test correlation with each possible key
    const results: Array<{ key: string; mode: 'major' | 'minor'; correlation: number }> = [];

    for (let i = 0; i < 12; i++) {
        // Major key correlation
        const majorProfile = rotateArray(MAJOR_PROFILE, i);
        const majorCorrelation = pearsonCorrelation(normalizedCounts, majorProfile);
        results.push({
            key: NOTE_NAMES[i],
            mode: 'major',
            correlation: majorCorrelation
        });

        // Minor key correlation
        const minorProfile = rotateArray(MINOR_PROFILE, i);
        const minorCorrelation = pearsonCorrelation(normalizedCounts, minorProfile);
        results.push({
            key: NOTE_NAMES[i],
            mode: 'minor',
            correlation: minorCorrelation
        });
    }

    // Sort by correlation (highest first)
    results.sort((a, b) => b.correlation - a.correlation);

    const best = results[0];

    // Calculate confidence based on how much better the best match is
    const secondBest = results[1];
    const confidence = Math.min(1, Math.max(0, (best.correlation - secondBest.correlation + 0.2) * 2));

    return {
        key: best.key,
        mode: best.mode,
        confidence,
        alternates: results.slice(1, 4) // Return top 3 alternatives
    };
}

/**
 * Format key for display (e.g., "Am" for A minor, "C" for C major)
 */
export function formatKey(key: string, mode: 'major' | 'minor'): string {
    return mode === 'minor' ? `${key}m` : key;
}

/**
 * Get the relative major/minor key
 */
export function getRelativeKey(key: string, mode: 'major' | 'minor'): { key: string; mode: 'major' | 'minor' } {
    const noteIndex = NOTE_NAMES.indexOf(key);
    if (noteIndex === -1) return { key, mode };

    if (mode === 'major') {
        // Relative minor is 3 semitones down
        const relativeIndex = (noteIndex - 3 + 12) % 12;
        return { key: NOTE_NAMES[relativeIndex], mode: 'minor' };
    } else {
        // Relative major is 3 semitones up
        const relativeIndex = (noteIndex + 3) % 12;
        return { key: NOTE_NAMES[relativeIndex], mode: 'major' };
    }
}

/**
 * Get the scale degrees for a given key
 */
export function getScaleNotes(key: string, mode: 'major' | 'minor'): string[] {
    const intervals = mode === 'major'
        ? [0, 2, 4, 5, 7, 9, 11]  // Major scale intervals
        : [0, 2, 3, 5, 7, 8, 10]; // Natural minor scale intervals

    const rootIndex = NOTE_NAMES.indexOf(key);
    if (rootIndex === -1) return [];

    return intervals.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);
}
