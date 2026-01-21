import { useMemo } from 'react';
import type { NoteEvent } from '../utils/pitchDetection';

interface NoteDisplayProps {
    notes: NoteEvent[];
    currentPitch: { note: string; octave: number; cents: number; frequency: number } | null;
    recordingDuration: number;
    isRecording: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Staff configuration for 3 octaves (C4 to C7 - whistle range)
const MIN_OCTAVE = 4;
const MAX_OCTAVE = 7;
const OCTAVE_RANGE = MAX_OCTAVE - MIN_OCTAVE; // 3 octaves

/**
 * Convert note to Y position percentage (0-100)
 * Maps 3 octaves (C4 to C7) across the staff
 */
function getNoteYPosition(note: string, octave: number): number {
    const noteIndex = NOTE_NAMES.indexOf(note);

    // Clamp octave to visible range
    const clampedOctave = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, octave));

    // Calculate position: each octave = 12 semitones
    // Total range = 36 semitones (3 octaves)
    const semitone = (clampedOctave - MIN_OCTAVE) * 12 + noteIndex;
    const totalSemitones = OCTAVE_RANGE * 12;

    // Normalize and invert (high pitch = top = low Y)
    const normalized = semitone / totalSemitones;

    // Map to staff area (5% to 95% to leave margins)
    return 95 - (normalized * 90);
}

/**
 * Convert precise pitch (with cents) to analog Y position
 */
function getPitchYPosition(note: string, octave: number, cents: number): number {
    const noteIndex = NOTE_NAMES.indexOf(note);
    const clampedOctave = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, octave));

    // Add cents offset (100 cents = 1 semitone)
    const preciseSemitone = (clampedOctave - MIN_OCTAVE) * 12 + noteIndex + (cents / 100);
    const totalSemitones = OCTAVE_RANGE * 12;

    const normalized = preciseSemitone / totalSemitones;
    return 95 - (normalized * 90);
}

/**
 * Get color based on note accuracy
 */
function getAccuracyColor(cents: number): string {
    const absCents = Math.abs(cents);
    if (absCents <= 10) return 'var(--color-note-green)';
    if (absCents <= 25) return 'var(--color-note-yellow)';
    if (absCents <= 40) return 'var(--color-note-orange)';
    return 'var(--color-note-red)';
}

export const NoteDisplay: React.FC<NoteDisplayProps> = ({
    notes,
    currentPitch,
    recordingDuration,
    isRecording
}) => {
    // Time window: show 12 seconds, with playhead at 85% position
    const timeWindow = 12;
    const playheadPercent = 85;

    const currentTime = recordingDuration;
    const startTime = currentTime - (timeWindow * playheadPercent / 100);
    const endTime = startTime + timeWindow;

    // Filter and keep notes visible for the full window
    const visibleNotes = useMemo(() => {
        return notes.filter(note => {
            const noteEnd = note.endTime || note.startTime + 0.1;
            // Keep visible if any part of the note is in the window
            return noteEnd >= startTime && note.startTime <= endTime;
        });
    }, [notes, startTime, endTime]);

    // Convert time to X percentage
    const timeToX = (time: number): number => {
        return ((time - startTime) / timeWindow) * 100;
    };

    // Generate staff lines for 3 octaves (every semitone)
    const staffLines = useMemo(() => {
        const lines = [];
        for (let octave = MIN_OCTAVE; octave <= MAX_OCTAVE; octave++) {
            for (let i = 0; i < 12; i++) {
                const noteName = NOTE_NAMES[i];
                // Only go up to C7
                if (octave === MAX_OCTAVE && i > 0) break;

                const y = getNoteYPosition(noteName, octave);
                const isC = noteName === 'C';
                const isNatural = !noteName.includes('#');

                lines.push({
                    y,
                    isOctave: isC,
                    isNatural,
                    label: isC ? `C${octave}` : undefined
                });
            }
        }
        return lines;
    }, []);

    return (
        <div className="note-display">
            {/* Staff Lines - using SVG with stretching for lines only */}
            <svg className="note-display__staff-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                {staffLines.map((line, i) => (
                    <line
                        key={i}
                        x1="0"
                        y1={line.y}
                        x2="100"
                        y2={line.y}
                        stroke={line.isOctave ? 'rgba(180, 175, 160, 0.6)' : line.isNatural ? 'rgba(180, 175, 160, 0.25)' : 'rgba(180, 175, 160, 0.1)'}
                        strokeWidth={line.isOctave ? '0.4' : '0.2'}
                    />
                ))}
            </svg>

            {/* Playhead line */}
            {isRecording && (
                <div
                    className="note-display__playhead"
                    style={{ left: `${playheadPercent}%` }}
                />
            )}

            {/* Note dots - using HTML divs to avoid SVG stretching */}
            <div className="note-display__notes">
                {visibleNotes.map((noteEvent, index) => {
                    const noteY = getNoteYPosition(noteEvent.note, noteEvent.octave);
                    const noteStartX = timeToX(noteEvent.startTime);
                    const noteEndX = noteEvent.endTime ? timeToX(noteEvent.endTime) : noteStartX + 1;
                    const duration = noteEndX - noteStartX;
                    const color = getAccuracyColor(noteEvent.cents);

                    // Clamp X positions to visible area
                    const clampedStartX = Math.max(0, Math.min(100, noteStartX));
                    const clampedEndX = Math.min(100, noteEndX);

                    if (clampedEndX < 0 || clampedStartX > 100) return null;

                    return (
                        <div key={`${index}-${noteEvent.startTime}`} className="note-group">
                            {/* Duration bar */}
                            {duration > 1.5 && (
                                <div
                                    className="note-duration-bar"
                                    style={{
                                        left: `calc(${clampedStartX}% + 6px)`,
                                        top: `${noteY}%`,
                                        width: `calc(${clampedEndX - clampedStartX}% - 6px)`,
                                        backgroundColor: color,
                                    }}
                                />
                            )}
                            {/* Note dot */}
                            <div
                                className="note-dot"
                                style={{
                                    left: `${clampedStartX}%`,
                                    top: `${noteY}%`,
                                    backgroundColor: color,
                                }}
                            />
                        </div>
                    );
                })}

                {/* Current pitch indicator */}
                {isRecording && currentPitch && (
                    <>
                        <div
                            className="note-display__pitch-line"
                            style={{
                                left: `calc(${playheadPercent}% + 12px)`,
                                backgroundColor: getAccuracyColor(currentPitch.cents),
                            }}
                        />
                        <div
                            className="note-dot note-dot--current"
                            style={{
                                left: `calc(${playheadPercent}% + 12px)`,
                                top: `${getPitchYPosition(currentPitch.note, currentPitch.octave, currentPitch.cents)}%`,
                                backgroundColor: getAccuracyColor(currentPitch.cents),
                            }}
                        />
                    </>
                )}
            </div>

            {/* Note label - small, positioned next to the pitch indicator */}
            {isRecording && currentPitch && (
                <div
                    className="note-display__label"
                    style={{
                        top: `${getPitchYPosition(currentPitch.note, currentPitch.octave, currentPitch.cents)}%`,
                        backgroundColor: getAccuracyColor(currentPitch.cents),
                    }}
                >
                    {currentPitch.note}{currentPitch.octave}
                </div>
            )}

            {/* Octave labels on left side */}
            <div className="note-display__octave-labels">
                {[7, 6, 5, 4].map(octave => (
                    <span
                        key={octave}
                        className="octave-label"
                        style={{ top: `${getNoteYPosition('C', octave)}%` }}
                    >
                        C{octave}
                    </span>
                ))}
            </div>
        </div>
    );
};
