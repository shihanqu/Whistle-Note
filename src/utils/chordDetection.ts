/**
 * Chord Detection Utilities
 * Harmonic analysis with chord progression generation
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface ChordResult {
    root: string;
    quality: string;
    name: string;
    notes: string[];
    confidence: number;
}

export interface ChordProgression {
    chords: ChordResult[];
    romanNumerals: string[];
    key: string;
    mode: 'major' | 'minor';
}

// Chord templates (intervals from root)
const CHORD_TEMPLATES: Record<string, number[]> = {
    'maj': [0, 4, 7],           // Major
    'min': [0, 3, 7],           // Minor
    'dim': [0, 3, 6],           // Diminished
    'aug': [0, 4, 8],           // Augmented
    'maj7': [0, 4, 7, 11],      // Major 7th
    'min7': [0, 3, 7, 10],      // Minor 7th
    '7': [0, 4, 7, 10],         // Dominant 7th
    'dim7': [0, 3, 6, 9],       // Diminished 7th
    'sus2': [0, 2, 7],          // Suspended 2nd
    'sus4': [0, 5, 7],          // Suspended 4th
    'add9': [0, 4, 7, 14],      // Add 9
    'min9': [0, 3, 7, 10, 14],  // Minor 9th
    'maj9': [0, 4, 7, 11, 14],  // Major 9th
};

/**
 * Detect chord from a collection of simultaneous notes
 */
export function detectChord(notes: string[]): ChordResult | null {
    if (notes.length < 2) {
        return null;
    }

    // Convert notes to pitch classes (0-11)
    const pitchClasses = notes
        .map(note => {
            const match = note.match(/^([A-G]#?)(\d*)$/);
            if (!match) return -1;
            return NOTE_NAMES.indexOf(match[1]);
        })
        .filter(pc => pc !== -1)
        .filter((pc, i, arr) => arr.indexOf(pc) === i); // Remove duplicates

    if (pitchClasses.length < 2) {
        return null;
    }

    let bestMatch: { root: string; quality: string; score: number } | null = null;

    // Try each note as potential root
    for (let root = 0; root < 12; root++) {
        // Calculate intervals from root
        const intervals = pitchClasses.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);

        // Compare against chord templates
        for (const [quality, template] of Object.entries(CHORD_TEMPLATES)) {
            const score = calculateChordMatch(intervals, template);

            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { root: NOTE_NAMES[root], quality, score };
            }
        }
    }

    if (!bestMatch) {
        return null;
    }

    // Build chord name
    const qualitySymbol = getQualitySymbol(bestMatch.quality);
    const chordName = `${bestMatch.root}${qualitySymbol}`;

    // Get chord notes
    const rootIndex = NOTE_NAMES.indexOf(bestMatch.root);
    const template = CHORD_TEMPLATES[bestMatch.quality];
    const chordNotes = template.map(interval => NOTE_NAMES[(rootIndex + interval) % 12]);

    return {
        root: bestMatch.root,
        quality: bestMatch.quality,
        name: chordName,
        notes: chordNotes,
        confidence: Math.min(1, bestMatch.score / template.length)
    };
}

/**
 * Calculate how well a set of intervals matches a chord template
 */
function calculateChordMatch(intervals: number[], template: number[]): number {
    let matches = 0;

    for (const templateInterval of template) {
        if (intervals.includes(templateInterval)) {
            matches++;
        }
    }

    // Penalize for extra notes not in template
    const extraNotes = intervals.length - matches;

    // Score: matches minus penalty for extra notes
    return matches - (extraNotes * 0.3);
}

/**
 * Get display symbol for chord quality
 */
function getQualitySymbol(quality: string): string {
    const symbols: Record<string, string> = {
        'maj': '',
        'min': 'm',
        'dim': '°',
        'aug': '+',
        'maj7': 'M7',
        'min7': 'm7',
        '7': '7',
        'dim7': '°7',
        'sus2': 'sus2',
        'sus4': 'sus4',
        'add9': 'add9',
        'min9': 'm9',
        'maj9': 'M9',
    };

    return symbols[quality] || quality;
}

/**
 * Analyze chord progressions in a sequence
 */
export function analyzeChordProgression(
    chords: ChordResult[],
    key: string,
    mode: 'major' | 'minor'
): ChordProgression {
    const romanNumerals = chords.map(chord =>
        chordToRomanNumeral(chord, key, mode)
    );

    return {
        chords,
        romanNumerals,
        key,
        mode
    };
}

/**
 * Convert a chord to Roman numeral notation
 */
function chordToRomanNumeral(chord: ChordResult, key: string, mode: 'major' | 'minor'): string {
    const keyIndex = NOTE_NAMES.indexOf(key);
    const chordIndex = NOTE_NAMES.indexOf(chord.root);

    if (keyIndex === -1 || chordIndex === -1) {
        return '?';
    }

    const degree = (chordIndex - keyIndex + 12) % 12;

    // Map semitones to scale degrees
    const majorDegrees = [0, 2, 4, 5, 7, 9, 11];
    const minorDegrees = [0, 2, 3, 5, 7, 8, 10];
    const degrees = mode === 'major' ? majorDegrees : minorDegrees;

    const degreeIndex = degrees.indexOf(degree);
    if (degreeIndex === -1) {
        // Chromatic chord
        return getModifiedRomanNumeral(degree, chord.quality);
    }

    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    let numeral = numerals[degreeIndex];

    // Lowercase for minor chords
    if (chord.quality.startsWith('min') || chord.quality === 'dim') {
        numeral = numeral.toLowerCase();
    }

    // Add quality suffixes
    if (chord.quality === 'dim') {
        numeral += '°';
    } else if (chord.quality === 'aug') {
        numeral += '+';
    } else if (chord.quality.includes('7')) {
        numeral += '7';
    }

    return numeral;
}

/**
 * Get Roman numeral for chromatic chords
 */
function getModifiedRomanNumeral(semitones: number, quality: string): string {
    // Common chromatic chord cases
    const chromaticMap: Record<number, string> = {
        1: '♭II',
        3: '♭III',
        6: '♭V',
        8: '♭VI',
        10: '♭VII'
    };

    let numeral = chromaticMap[semitones] || '?';

    if (quality.startsWith('min') || quality === 'dim') {
        numeral = numeral.toLowerCase();
    }

    return numeral;
}

/**
 * Suggest probable chord based on melody notes and key
 */
export function suggestChordFromMelody(
    melodyNotes: string[],
    key: string,
    mode: 'major' | 'minor'
): ChordResult | null {
    if (melodyNotes.length === 0) {
        return null;
    }

    // Get scale chords for the key
    const scaleChords = getScaleChords(key, mode);

    // Find chord that best fits the melody notes
    let bestChord: ChordResult | null = null;
    let bestScore = 0;

    for (const chord of scaleChords) {
        let score = 0;
        for (const note of melodyNotes) {
            const noteBase = note.replace(/\d+$/, ''); // Remove octave
            if (chord.notes.includes(noteBase)) {
                score++;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestChord = chord;
        }
    }

    return bestChord;
}

/**
 * Get diatonic chords for a key
 */
function getScaleChords(key: string, mode: 'major' | 'minor'): ChordResult[] {
    const keyIndex = NOTE_NAMES.indexOf(key);
    if (keyIndex === -1) return [];

    const majorPattern: Array<{ interval: number; quality: string }> = [
        { interval: 0, quality: 'maj' },
        { interval: 2, quality: 'min' },
        { interval: 4, quality: 'min' },
        { interval: 5, quality: 'maj' },
        { interval: 7, quality: 'maj' },
        { interval: 9, quality: 'min' },
        { interval: 11, quality: 'dim' },
    ];

    const minorPattern: Array<{ interval: number; quality: string }> = [
        { interval: 0, quality: 'min' },
        { interval: 2, quality: 'dim' },
        { interval: 3, quality: 'maj' },
        { interval: 5, quality: 'min' },
        { interval: 7, quality: 'min' },
        { interval: 8, quality: 'maj' },
        { interval: 10, quality: 'maj' },
    ];

    const pattern = mode === 'major' ? majorPattern : minorPattern;

    return pattern.map(({ interval, quality }) => {
        const root = NOTE_NAMES[(keyIndex + interval) % 12];
        const template = CHORD_TEMPLATES[quality];
        const notes = template.map(i => NOTE_NAMES[(keyIndex + interval + i) % 12]);

        return {
            root,
            quality,
            name: `${root}${getQualitySymbol(quality)}`,
            notes,
            confidence: 1
        };
    });
}
