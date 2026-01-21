import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

export const MicIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
);

export const StopIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m15 18-6-6 6-6" />
    </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <line x1="4" x2="4" y1="21" y2="14" />
        <line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" />
        <line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" />
        <line x1="20" x2="20" y1="12" y2="3" />
        <line x1="2" x2="6" y1="14" y2="14" />
        <line x1="10" x2="14" y1="8" y2="8" />
        <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

export const MetronomeIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M12 2C11.5 2 11 2.19 10.59 2.59L3.59 9.59C3.21 9.97 3 10.47 3 11V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V11C21 10.47 20.79 9.97 20.41 9.59L13.41 2.59C13 2.19 12.5 2 12 2M12 4.83L18.17 11H5.83L12 4.83M12 6L8 10H16L12 6M11 13V17H13V13H11Z" />
    </svg>
);

export const MusicNoteIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
);

export const GuitarIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m11.9 12.1 4.514-4.514" />
        <path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 15 8.172H13.656a2 2 0 0 0-1.414.586L11.1 9.9" />
        <path d="m6 16 2 2" />
        <path d="M8.2 9.9C8.7 9.4 9.3 9 10 8.8c.7-.2 1.4-.1 2.1.2.7.3 1.3.7 1.8 1.2.5.5.8 1.1 1 1.7.2.6.2 1.3 0 1.9-.2.6-.5 1.2-1 1.7-.5.5-1.1.9-1.8 1.1-.7.2-1.4.2-2.1 0a4 4 0 0 1-1.8-1L5.1 18.9a2.8 2.8 0 0 1-2 .8c-.8 0-1.5-.3-2-.8-.5-.5-.8-1.1-.8-1.8 0-.7.2-1.4.5-2.1.4-.7.9-1.4 1.6-2L8.2 9.9Z" />
    </svg>
);

export const WhistleIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4" />
        <path d="m6.8 6.8 2.8 2.8" />
        <path d="M2 12h4" />
        <path d="m6.8 17.2 2.8-2.8" />
        <path d="M12 18v4" />
        <path d="m17.2 17.2-2.8-2.8" />
        <path d="M18 12h4" />
        <path d="m17.2 6.8-2.8 2.8" />
    </svg>
);
