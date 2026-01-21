import type { NoteEvent } from './pitchDetection';

/**
 * Converts a sequence of detected notes into Strudel mini-notation.
 * 
 * In Strudel:
 * - c4, d4, e4, etc. represent notes.
 * - c#4 becomes cs4.
 * - durations can be specified with @ (e.g., c4@2).
 * - ~ represents a rest.
 */
export function convertNotesToStrudel(notes: NoteEvent[]): string {
    if (notes.length === 0) return "";

    const strudelNotes: string[] = [];
    let lastEndTime = notes[0].startTime;

    // Initial rest if recording didn't start with a note immediately
    if (lastEndTime > 0.05) {
        strudelNotes.push(`~@${lastEndTime.toFixed(2)}`);
    }

    notes.forEach((note, index) => {
        // Check for rest between notes
        const restDuration = note.startTime - lastEndTime;
        if (restDuration > 0.05) {
            strudelNotes.push(`~@${restDuration.toFixed(2)}`);
        }

        // Convert note name to Strudel format (e.g., C#4 -> cs4)
        const noteName = note.note.toLowerCase().replace('#', 's');
        const duration = (note.duration || (note.endTime ? note.endTime - note.startTime : 0.1));

        // Append note with its duration
        strudelNotes.push(`${noteName}${note.octave}@${duration.toFixed(2)}`);

        // Add line break every 4 notes for readability
        if ((index + 1) % 4 === 0 && index !== notes.length - 1) {
            strudelNotes.push('\n  ');
        }

        lastEndTime = note.endTime || note.startTime + duration;
    });

    return `note("<${strudelNotes.join(' ')}>")`;
}
