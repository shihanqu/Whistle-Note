import { useState, useCallback, useEffect } from 'react';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { NoteDisplay } from './components/NoteDisplay';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { TimerDisplay } from './components/TimerDisplay';
import { SettingsPanel, type SensitivityLevel } from './components/SettingsPanel';
import { convertNotesToStrudel } from './utils/strudelOutput';
import { DebugOverlay } from './components/DebugOverlay';
import {
  MicIcon,
  ChevronLeftIcon,
  SettingsIcon,
  HistoryIcon,
  CheckIcon,
  MetronomeIcon,
  MusicNoteIcon
} from './components/Icons';

type InputMode = 'whistle' | 'guitar';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>('whistle');
  const [debugMode, setDebugMode] = useState(false);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('medium');
  const [minNoteDuration, setMinNoteDuration] = useState(50);
  const [strudelOutput, setStrudelOutput] = useState<string | null>(null);

  const {
    isRecording,
    isInitialized,
    error,
    currentPitch,
    accuracy,
    stability,
    tempo,
    notes,
    recordingDuration,
    waveformData,
    initialize,
    startRecording,
    stopRecording,
    clearNotes,
    formattedKey
  } = useAudioProcessor({ mode, sensitivity, minNoteDuration });

  // Auto-initialize microphone on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      setStrudelOutput(null);
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleDone = useCallback(() => {
    let finalNotes = notes;
    if (isRecording) {
      finalNotes = stopRecording();
    }
    const output = convertNotesToStrudel(finalNotes);
    setStrudelOutput(output);
  }, [isRecording, stopRecording, notes]);

  const handleModeChange = useCallback((newMode: InputMode) => {
    setMode(newMode);
  }, []);

  const handleDebugModeChange = useCallback((enabled: boolean) => {
    setDebugMode(enabled);
  }, []);

  const handleSensitivityChange = useCallback((level: SensitivityLevel) => {
    setSensitivity(level);
  }, []);

  const handleMinNoteDurationChange = useCallback((duration: number) => {
    setMinNoteDuration(duration);
  }, []);

  const copyToClipboard = () => {
    if (strudelOutput) {
      navigator.clipboard.writeText(strudelOutput);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <button className="header__back" aria-label="Go back">
          <ChevronLeftIcon size={24} />
        </button>

        <div className="header__title">
          <div className="header__label">Live Recording</div>
          <h1 className="header__name">
            {mode === 'whistle' ? 'Whistle Note' : 'Guitar Note'}
          </h1>
        </div>

        <button
          className="header__settings"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon size={24} />
        </button>
      </header>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-toggle__option ${mode === 'whistle' ? 'active' : ''}`}
          onClick={() => handleModeChange('whistle')}
        >
          Whistle
        </button>
        <button
          className={`mode-toggle__option ${mode === 'guitar' ? 'active' : ''}`}
          onClick={() => handleModeChange('guitar')}
        >
          Guitar
        </button>
      </div>

      {/* Timer with Waveform Background */}
      <div className="timer-section">
        <WaveformVisualizer
          data={waveformData}
          isRecording={isRecording}
        />
        <TimerDisplay durationSeconds={recordingDuration} />
      </div>

      {/* Info Badges */}
      <div className="info-badges">
        <div
          className={`badge badge--bpm ${tempo && tempo.confidence > 0.5 ? 'flashing' : ''}`}
          style={{ '--beat-duration': `${60 / (tempo?.bpm || 120)}s` } as React.CSSProperties}
        >
          <span className="badge__icon">
            <MetronomeIcon size={16} />
          </span>
          <span>{tempo?.bpm || '--'} BPM</span>
        </div>

        <div className="badge badge--key">
          <span className="badge__icon">
            <MusicNoteIcon size={16} />
          </span>
          <span>{formattedKey || '--'} Key</span>
        </div>
      </div>

      {/* Note Display with Debug Overlay */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {debugMode && isRecording && (
          <DebugOverlay
            currentPitch={currentPitch}
            accuracy={accuracy}
            stability={stability}
            notesCount={notes.length}
            recordingDuration={recordingDuration}
          />
        )}
        <NoteDisplay
          notes={notes}
          currentPitch={currentPitch}
          recordingDuration={recordingDuration}
          isRecording={isRecording}
        />

        {/* Strudel Output Overlay */}
        {strudelOutput && (
          <div className="strudel-overlay">
            <div className="strudel-overlay__content">
              <h3>Strudel Notation</h3>
              <div className="strudel-code">
                <pre><code>{strudelOutput}</code></pre>
              </div>
              <div className="strudel-overlay__actions">
                <button className="overlay-btn" onClick={copyToClipboard}>Copy</button>
                <button className="overlay-btn overlay-btn--close" onClick={() => setStrudelOutput(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="stats">
        <div className="stat">
          <div className="stat__label">Precision</div>
          <div className={`stat__value stat__value--precision`}>
            {isRecording && currentPitch ? `${Math.round(accuracy)}%` : '--'}
          </div>
        </div>

        <div className="stat">
          <div className="stat__label">Stability</div>
          <div className={`stat__value stat__value--${stability.toLowerCase()}`}>
            {isRecording ? stability : '--'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className="control-btn"
          onClick={clearNotes}
          aria-label="Clear history"
        >
          <HistoryIcon size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className={`control-btn control-btn--record ${isRecording ? 'recording' : ''}`}
            onClick={handleRecordToggle}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <div className="icon-stop" />
            ) : (
              <MicIcon size={24} className="icon-mic" />
            )}
          </button>
          <span className="record-label">
            {isRecording ? 'REC' : ''}
          </span>
        </div>

        <button
          className="control-btn"
          aria-label="Done"
          onClick={handleDone}
        >
          <CheckIcon size={22} />
        </button>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={handleModeChange}
        debugMode={debugMode}
        onDebugModeChange={handleDebugModeChange}
        sensitivity={sensitivity}
        onSensitivityChange={handleSensitivityChange}
        minNoteDuration={minNoteDuration}
        onMinNoteDurationChange={handleMinNoteDurationChange}
      />

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
