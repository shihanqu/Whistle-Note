/**
 * Audio Processing Hook
 * Handles microphone input and real-time pitch detection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, calculateAccuracy, calculateStability } from '../utils/pitchDetection';
import type { PitchResult, NoteEvent } from '../utils/pitchDetection';
import { detectKey, formatKey } from '../utils/keyDetection';
import type { KeyResult } from '../utils/keyDetection';
import { estimateTempoFromNotes } from '../utils/tempoDetection';
import type { TempoResult } from '../utils/tempoDetection';
import { extractNotes, smoothMelody } from '../utils/melodyExtraction';

export interface AudioState {
    isRecording: boolean;
    isInitialized: boolean;
    error: string | null;
    currentPitch: PitchResult | null;
    accuracy: number;
    stability: 'High' | 'Medium' | 'Low';
    detectedKey: KeyResult | null;
    tempo: TempoResult | null;
    notes: NoteEvent[];
    recordingDuration: number;
    waveformData: number[];
}

interface UseAudioProcessorOptions {
    fftSize?: number;
    smoothingTimeConstant?: number;
    mode?: 'whistle' | 'guitar';
    sensitivity?: 'low' | 'medium' | 'high';
    minNoteDuration?: number;
}

// Frequency ranges for different modes
const FREQUENCY_RANGES = {
    whistle: { min: 500, max: 2500 },  // Human whistle range
    guitar: { min: 80, max: 1200 }     // Guitar fundamental range
};

// RMS thresholds for sensitivity levels (lower = more sensitive)
const SENSITIVITY_THRESHOLDS = {
    low: 0.02,
    medium: 0.01,
    high: 0.005
};

export function useAudioProcessor(options: UseAudioProcessorOptions = {}) {
    const {
        fftSize = 2048,
        smoothingTimeConstant = 0.8,
        mode = 'whistle',
        sensitivity = 'medium',
        minNoteDuration = 100
    } = options;
    const frequencyRange = FREQUENCY_RANGES[mode];
    const rmsThreshold = SENSITIVITY_THRESHOLDS[sensitivity];

    const [state, setState] = useState<AudioState>({
        isRecording: false,
        isInitialized: false,
        error: null,
        currentPitch: null,
        accuracy: 0,
        stability: 'Low',
        detectedKey: null,
        tempo: null,
        notes: [],
        recordingDuration: 0,
        waveformData: []
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const monitorFrameRef = useRef<number | null>(null);
    const isRecordingRef = useRef<boolean>(false);
    const startTimeRef = useRef<number>(0);
    const pitchHistoryRef = useRef<Array<PitchResult & { time: number }>>([]);
    const recentPitchesRef = useRef<PitchResult[]>([]);
    const lastUpdateTimeRef = useRef<number>(0);
    const smoothedPitchRef = useRef<PitchResult | null>(null);

    /**
     * Initialize audio context and request microphone access
     */
    const initialize = useCallback(async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Create audio context
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = smoothingTimeConstant;

            // Connect microphone to analyser
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Store references
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;
            streamRef.current = stream;

            setState(prev => ({ ...prev, isInitialized: true, error: null }));

            // Start continuous audio monitoring for waveform
            startMonitoring();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to access microphone';
            setState(prev => ({ ...prev, error: message }));
        }
    }, [fftSize, smoothingTimeConstant]);

    /**
     * Start recording and pitch detection
     */
    const startRecording = useCallback(() => {
        if (!analyserRef.current || !audioContextRef.current) {
            setState(prev => ({ ...prev, error: 'Audio not initialized' }));
            return;
        }

        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        startTimeRef.current = Date.now();
        pitchHistoryRef.current = [];
        recentPitchesRef.current = [];

        setState(prev => ({
            ...prev,
            isRecording: true,
            notes: [],
            recordingDuration: 0,
            currentPitch: null,
            detectedKey: null,
            tempo: null
        }));

        isRecordingRef.current = true;

        // Start processing loop
        processAudio();
    }, []);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Process collected pitch data into notes
        const extractedNotes = extractNotes(pitchHistoryRef.current);
        const smoothedNotes = smoothMelody(extractedNotes);

        // Detect key from notes
        const keyResult = smoothedNotes.length >= 4
            ? detectKey(smoothedNotes.map(n => ({ note: n.note, duration: n.duration })))
            : null;

        // Estimate tempo
        const tempoResult = estimateTempoFromNotes(smoothedNotes);

        setState(prev => ({
            ...prev,
            isRecording: false,
            notes: smoothedNotes,
            detectedKey: keyResult,
            tempo: tempoResult,
            currentPitch: null
        }));

        isRecordingRef.current = false;
        return smoothedNotes;
    }, []);

    /**
     * Main audio processing loop
     */
    const processAudio = useCallback(() => {
        if (!analyserRef.current || !audioContextRef.current) return;

        const analyser = analyserRef.current;
        const sampleRate = audioContextRef.current.sampleRate;
        const currentTime = (Date.now() - startTimeRef.current) / 1000;

        // Get time domain data for pitch detection
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        // Get waveform data for visualization
        const waveformData: number[] = [];
        const step = Math.ceil(bufferLength / 100);
        for (let i = 0; i < bufferLength; i += step) {
            waveformData.push(dataArray[i]);
        }

        // Detect pitch with sensitivity-based threshold
        const rawPitchResult = detectPitch(dataArray, sampleRate, rmsThreshold);

        // Filter by frequency range based on mode
        const pitchResult = rawPitchResult &&
            rawPitchResult.frequency >= frequencyRange.min &&
            rawPitchResult.frequency <= frequencyRange.max
            ? rawPitchResult
            : null;

        if (pitchResult) {
            // Add to recent pitches for smoothing
            recentPitchesRef.current.push(pitchResult);
            if (recentPitchesRef.current.length > 5) {
                recentPitchesRef.current.shift();
            }

            // Smooth the pitch by averaging recent detections
            const recentPitches = recentPitchesRef.current;
            if (recentPitches.length >= 2) {
                // Find the most common note in recent pitches
                const noteCounts = new Map<string, number>();
                for (const p of recentPitches) {
                    const key = `${p.note}${p.octave}`;
                    noteCounts.set(key, (noteCounts.get(key) || 0) + 1);
                }

                let dominantNote = pitchResult.note;
                let dominantOctave = pitchResult.octave;
                let maxCount = 0;

                for (const [key, count] of noteCounts) {
                    if (count > maxCount) {
                        maxCount = count;
                        const match = key.match(/^([A-G]#?)(\d+)$/);
                        if (match) {
                            dominantNote = match[1];
                            dominantOctave = parseInt(match[2]);
                        }
                    }
                }

                // Average the cents for the dominant note
                const matchingPitches = recentPitches.filter(
                    p => p.note === dominantNote && p.octave === dominantOctave
                );
                const avgCents = matchingPitches.length > 0
                    ? Math.round(matchingPitches.reduce((sum, p) => sum + p.cents, 0) / matchingPitches.length)
                    : pitchResult.cents;

                smoothedPitchRef.current = {
                    ...pitchResult,
                    note: dominantNote,
                    octave: dominantOctave,
                    cents: avgCents
                };
            } else {
                smoothedPitchRef.current = pitchResult;
            }

            // Add to history (throttled to reduce jitter)
            const timeSinceLastAdd = currentTime - (pitchHistoryRef.current[pitchHistoryRef.current.length - 1]?.time || 0);
            if (timeSinceLastAdd >= 0.05) { // Max 20 samples per second for history
                pitchHistoryRef.current.push({ ...smoothedPitchRef.current, time: currentTime });
            }
        } else {
            // No pitch detected - clear smoothed pitch after a short delay
            if (recentPitchesRef.current.length > 0) {
                recentPitchesRef.current.shift();
            }
            if (recentPitchesRef.current.length === 0) {
                smoothedPitchRef.current = null;
            }
        }

        // Calculate accuracy and stability
        const displayPitch = smoothedPitchRef.current;
        const accuracy = displayPitch ? calculateAccuracy(displayPitch.cents) : 0;
        const stability = calculateStability(recentPitchesRef.current);

        // Throttle state updates to reduce jitter (update every 50ms = 20fps)
        const timeSinceUpdate = Date.now() - lastUpdateTimeRef.current;
        if (timeSinceUpdate >= 50) {
            lastUpdateTimeRef.current = Date.now();

            // Real-time note extraction for display
            const recentNotes = extractNotes(
                pitchHistoryRef.current,
                { minNoteDuration: minNoteDuration / 1000 } // Convert ms to seconds
            );

            // Real-time key detection
            let keyResult = null;
            if (recentNotes.length >= 4) {
                keyResult = detectKey(recentNotes.map(n => ({ note: n.note, duration: n.duration })));
            }

            // Real-time tempo estimation
            const tempoResult = estimateTempoFromNotes(recentNotes);

            setState(prev => ({
                ...prev,
                currentPitch: displayPitch,
                accuracy,
                stability,
                recordingDuration: currentTime,
                waveformData,
                notes: recentNotes,
                detectedKey: keyResult,
                tempo: tempoResult
            }));
        }

        // Continue loop
        animationFrameRef.current = requestAnimationFrame(processAudio);
    }, []);

    /**
     * Continuous audio monitoring (for waveform when not recording)
     */
    const monitorAudio = useCallback(() => {
        if (!analyserRef.current || !audioContextRef.current) return;

        // Skip if we're recording (processAudio handles it)
        if (isRecordingRef.current) {
            monitorFrameRef.current = requestAnimationFrame(monitorAudio);
            return;
        }

        const analyser = analyserRef.current;
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        // Get waveform data for visualization
        const waveformData: number[] = [];
        const step = Math.ceil(bufferLength / 100);
        for (let i = 0; i < bufferLength; i += step) {
            waveformData.push(dataArray[i]);
        }

        setState(prev => ({
            ...prev,
            waveformData
        }));

        monitorFrameRef.current = requestAnimationFrame(monitorAudio);
    }, []);

    /**
     * Start continuous monitoring
     */
    const startMonitoring = useCallback(() => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        monitorAudio();
    }, [monitorAudio]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (monitorFrameRef.current) {
                cancelAnimationFrame(monitorFrameRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    /**
     * Clear recorded notes
     */
    const clearNotes = useCallback(() => {
        pitchHistoryRef.current = [];
        recentPitchesRef.current = [];
        setState(prev => ({
            ...prev,
            notes: [],
            detectedKey: null,
            tempo: null,
            recordingDuration: 0
        }));
    }, []);

    return {
        ...state,
        initialize,
        startRecording,
        stopRecording,
        clearNotes,
        formattedKey: state.detectedKey
            ? formatKey(state.detectedKey.key, state.detectedKey.mode)
            : null
    };
}
