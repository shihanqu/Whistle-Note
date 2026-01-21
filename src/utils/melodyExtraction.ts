/**
 * Melody Extraction Utilities
 * Continuous pitch tracking with note segmentation
 */

import type { PitchResult, NoteEvent } from './pitchDetection';

export interface MelodySegment {
    notes: NoteEvent[];
    startTime: number;
    endTime: number;
    key?: string;
    mode?: 'major' | 'minor';
}

/**
 * Configuration for melody extraction
 */
export interface MelodyExtractionConfig {
    minNoteDuration: number;      // Minimum note duration in seconds
    maxGapDuration: number;       // Maximum gap between notes to consider same phrase
    pitchStabilityThreshold: number; // Hz variance threshold for stable pitch
    confidenceThreshold: number;  // Minimum confidence to consider valid
}

const DEFAULT_CONFIG: MelodyExtractionConfig = {
    minNoteDuration: 0.08,        // 80ms minimum
    maxGapDuration: 0.3,          // 300ms gap = new phrase
    pitchStabilityThreshold: 5,   // 5Hz variance
    confidenceThreshold: 0.6
};

/**
 * Extract discrete notes from continuous pitch readings
 */
export function extractNotes(
    pitchReadings: Array<PitchResult & { time: number }>,
    config: Partial<MelodyExtractionConfig> = {}
): NoteEvent[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const notes: NoteEvent[] = [];

    if (pitchReadings.length === 0) {
        return notes;
    }

    let currentNote: Partial<NoteEvent> | null = null;
    // Note start time tracked in currentNote
    let lastValidTime = 0;
    let pitchBuffer: number[] = [];

    for (const reading of pitchReadings) {
        // Skip low confidence readings
        if (reading.confidence < cfg.confidenceThreshold) {
            // Check if we should end current note due to silence
            if (currentNote && reading.time - lastValidTime > cfg.maxGapDuration) {
                finalizeNote(currentNote, lastValidTime, pitchBuffer, cfg);
                if (isValidNote(currentNote as NoteEvent, cfg)) {
                    notes.push(currentNote as NoteEvent);
                }
                currentNote = null;
                pitchBuffer = [];
            }
            continue;
        }

        // Check if same note continues

        if (!currentNote) {
            // Start new note
            currentNote = {
                note: reading.note,
                octave: reading.octave,
                frequency: reading.frequency,
                startTime: reading.time,
                cents: reading.cents,
                confidence: reading.confidence
            };
            pitchBuffer = [reading.frequency];
        } else if (
            currentNote.note === reading.note &&
            currentNote.octave === reading.octave
        ) {
            // Continue same note - update running averages
            pitchBuffer.push(reading.frequency);
            currentNote.cents = (currentNote.cents! + reading.cents) / 2;
            currentNote.confidence = Math.max(currentNote.confidence!, reading.confidence);
        } else {
            // Different note detected - finalize current and start new
            finalizeNote(currentNote, lastValidTime, pitchBuffer, cfg);
            if (isValidNote(currentNote as NoteEvent, cfg)) {
                notes.push(currentNote as NoteEvent);
            }

            // Start new note
            currentNote = {
                note: reading.note,
                octave: reading.octave,
                frequency: reading.frequency,
                startTime: reading.time,
                cents: reading.cents,
                confidence: reading.confidence
            };
            pitchBuffer = [reading.frequency];
        }

        lastValidTime = reading.time;
    }

    // Finalize last note
    if (currentNote) {
        finalizeNote(currentNote, lastValidTime, pitchBuffer, cfg);
        if (isValidNote(currentNote as NoteEvent, cfg)) {
            notes.push(currentNote as NoteEvent);
        }
    }

    return notes;
}

/**
 * Finalize note with calculated duration and average frequency
 */
function finalizeNote(
    note: Partial<NoteEvent>,
    endTime: number,
    pitchBuffer: number[],
    _config: MelodyExtractionConfig
): void {
    note.endTime = endTime;
    note.duration = endTime - note.startTime!;

    // Calculate average frequency
    if (pitchBuffer.length > 0) {
        note.frequency = pitchBuffer.reduce((a, b) => a + b, 0) / pitchBuffer.length;
    }
}

/**
 * Check if note meets minimum requirements
 */
function isValidNote(note: NoteEvent, config: MelodyExtractionConfig): boolean {
    return (
        note.duration !== undefined &&
        note.duration >= config.minNoteDuration &&
        note.confidence >= config.confidenceThreshold
    );
}

/**
 * Segment melody into phrases
 */
export function segmentMelody(
    notes: NoteEvent[],
    maxGapDuration: number = 0.5
): MelodySegment[] {
    if (notes.length === 0) {
        return [];
    }

    const segments: MelodySegment[] = [];
    let currentSegment: NoteEvent[] = [notes[0]];
    let segmentStart = notes[0].startTime;

    for (let i = 1; i < notes.length; i++) {
        const gap = notes[i].startTime - (notes[i - 1].endTime || notes[i - 1].startTime);

        if (gap > maxGapDuration) {
            // End current segment, start new one
            segments.push({
                notes: currentSegment,
                startTime: segmentStart,
                endTime: notes[i - 1].endTime || notes[i - 1].startTime
            });
            currentSegment = [notes[i]];
            segmentStart = notes[i].startTime;
        } else {
            currentSegment.push(notes[i]);
        }
    }

    // Add final segment
    if (currentSegment.length > 0) {
        const lastNote = currentSegment[currentSegment.length - 1];
        segments.push({
            notes: currentSegment,
            startTime: segmentStart,
            endTime: lastNote.endTime || lastNote.startTime
        });
    }

    return segments;
}

/**
 * Smooth melody by removing very short notes and filling gaps
 */
export function smoothMelody(
    notes: NoteEvent[],
    minDuration: number = 0.1
): NoteEvent[] {
    if (notes.length === 0) return [];

    const smoothed: NoteEvent[] = [];

    for (const note of notes) {
        if (note.duration && note.duration >= minDuration) {
            // Check if this note should merge with previous
            if (smoothed.length > 0) {
                const prev = smoothed[smoothed.length - 1];
                const gap = note.startTime - (prev.endTime || prev.startTime);

                // Merge if same note and small gap
                if (prev.note === note.note &&
                    prev.octave === note.octave &&
                    gap < 0.05) {
                    prev.endTime = note.endTime;
                    prev.duration = (prev.endTime || 0) - prev.startTime;
                    continue;
                }
            }

            smoothed.push({ ...note });
        }
    }

    return smoothed;
}

/**
 * Quantize note timings to a grid
 */
export function quantizeNotes(
    notes: NoteEvent[],
    bpm: number,
    subdivision: number = 16
): NoteEvent[] {
    const beatDuration = 60 / bpm;
    const gridSize = beatDuration / (subdivision / 4);

    return notes.map(note => {
        const quantizedStart = Math.round(note.startTime / gridSize) * gridSize;
        const quantizedEnd = note.endTime
            ? Math.round(note.endTime / gridSize) * gridSize
            : quantizedStart + gridSize;

        return {
            ...note,
            startTime: quantizedStart,
            endTime: Math.max(quantizedEnd, quantizedStart + gridSize),
            duration: Math.max(quantizedEnd - quantizedStart, gridSize)
        };
    });
}

/**
 * Convert notes to a simple melody string representation
 */
export function notesToMelodyString(notes: NoteEvent[]): string {
    return notes.map(n => `${n.note}${n.octave}`).join(' ');
}

/**
 * Calculate melodic intervals between consecutive notes
 */
export function calculateIntervals(notes: NoteEvent[]): number[] {
    const intervals: number[] = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let i = 1; i < notes.length; i++) {
        const prev = notes[i - 1];
        const curr = notes[i];

        const prevPitch = noteNames.indexOf(prev.note) + prev.octave * 12;
        const currPitch = noteNames.indexOf(curr.note) + curr.octave * 12;

        intervals.push(currPitch - prevPitch);
    }

    return intervals;
}

/**
 * Analyze melodic contour (ascending, descending, static patterns)
 */
export function analyzeMelodicContour(notes: NoteEvent[]): string {
    const intervals = calculateIntervals(notes);

    if (intervals.length === 0) return 'static';

    const ascending = intervals.filter(i => i > 0).length;
    const descending = intervals.filter(i => i < 0).length;
    const static_ = intervals.filter(i => i === 0).length;

    const total = intervals.length;

    if (ascending / total > 0.6) return 'ascending';
    if (descending / total > 0.6) return 'descending';
    if (static_ / total > 0.4) return 'static';
    if (ascending > descending) return 'mostly-ascending';
    if (descending > ascending) return 'mostly-descending';

    return 'mixed';
}
