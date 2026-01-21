import { CloseIcon } from './Icons';

export type SensitivityLevel = 'low' | 'medium' | 'high';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'whistle' | 'guitar';
    onModeChange: (mode: 'whistle' | 'guitar') => void;
    debugMode: boolean;
    onDebugModeChange: (enabled: boolean) => void;
    sensitivity: SensitivityLevel;
    onSensitivityChange: (level: SensitivityLevel) => void;
    minNoteDuration: number;
    onMinNoteDurationChange: (duration: number) => void;
}

const SENSITIVITY_VALUES: SensitivityLevel[] = ['low', 'medium', 'high'];
const MIN_NOTE_DURATIONS = [50, 80, 100, 150, 200];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    mode,
    onModeChange,
    debugMode,
    onDebugModeChange,
    sensitivity,
    onSensitivityChange,
    minNoteDuration,
    onMinNoteDurationChange
}) => {
    const sensitivityIndex = SENSITIVITY_VALUES.indexOf(sensitivity);

    return (
        <div className={`settings-panel ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                className="settings-panel__content"
                onClick={e => e.stopPropagation()}
            >
                <div className="settings-panel__header">
                    <h2 className="settings-panel__title">Settings</h2>
                    <button
                        className="settings-panel__close"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <CloseIcon size={20} />
                    </button>
                </div>

                <div className="settings-panel__body">
                    <div className="settings-group">
                        <h3 className="settings-group__title">Input Mode</h3>

                        <div
                            className={`setting-item ${mode === 'whistle' ? 'active' : ''}`}
                            onClick={() => onModeChange('whistle')}
                        >
                            <span className="setting-item__label">Whistle / Voice</span>
                            <span className="setting-item__check">
                                {mode === 'whistle' && '✓'}
                            </span>
                        </div>

                        <div
                            className={`setting-item ${mode === 'guitar' ? 'active' : ''}`}
                            onClick={() => onModeChange('guitar')}
                        >
                            <span className="setting-item__label">Guitar / Instrument</span>
                            <span className="setting-item__check">
                                {mode === 'guitar' && '✓'}
                            </span>
                        </div>
                    </div>

                    <div className="settings-group">
                        <h3 className="settings-group__title">Sensitivity</h3>

                        <div className="slider-control">
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="1"
                                value={sensitivityIndex}
                                onChange={(e) => onSensitivityChange(SENSITIVITY_VALUES[parseInt(e.target.value)])}
                                className="slider-control__input"
                            />
                            <div className="slider-control__labels">
                                <span className={sensitivityIndex === 0 ? 'active' : ''}>Low</span>
                                <span className={sensitivityIndex === 1 ? 'active' : ''}>Medium</span>
                                <span className={sensitivityIndex === 2 ? 'active' : ''}>High</span>
                            </div>
                        </div>

                        <p className="setting-item__hint">
                            Higher sensitivity detects quieter sounds but may pick up noise
                        </p>
                    </div>

                    <div className="settings-group">
                        <h3 className="settings-group__title">Detection</h3>

                        <div className="setting-item">
                            <span className="setting-item__label">Reference Pitch</span>
                            <span className="setting-item__value">A5 = 880 Hz</span>
                        </div>

                        <div className="setting-item">
                            <span className="setting-item__label">Frequency Range</span>
                            <span className="setting-item__value">
                                {mode === 'whistle' ? '500–2500 Hz' : '80–1200 Hz'}
                            </span>
                        </div>

                        <div className="setting-item setting-item--column">
                            <div className="setting-item__row">
                                <span className="setting-item__label">Min Note Duration</span>
                                <span className="setting-item__value">{minNoteDuration}ms</span>
                            </div>
                            <div className="duration-options">
                                {MIN_NOTE_DURATIONS.map(duration => (
                                    <button
                                        key={duration}
                                        className={`duration-option ${minNoteDuration === duration ? 'active' : ''}`}
                                        onClick={() => onMinNoteDurationChange(duration)}
                                    >
                                        {duration}ms
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="settings-group">
                        <h3 className="settings-group__title">Developer</h3>

                        <div
                            className={`setting-item setting-item--toggle ${debugMode ? 'active' : ''}`}
                            onClick={() => onDebugModeChange(!debugMode)}
                        >
                            <span className="setting-item__label">Debug Mode</span>
                            <div className={`toggle-switch ${debugMode ? 'on' : ''}`}>
                                <div className="toggle-switch__track" />
                                <div className="toggle-switch__thumb" />
                            </div>
                        </div>

                        <p className="setting-item__hint">
                            Shows frequency, confidence, and other detection details
                        </p>
                    </div>

                    <div className="settings-group">
                        <h3 className="settings-group__title">About</h3>

                        <div className="setting-item">
                            <span className="setting-item__label">Version</span>
                            <span className="setting-item__value">1.0.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
