import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function CrosswordIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

export function ImageRecognitionIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export function AudiobookIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M3 14v-2a9 9 0 0118 0v2" />
      <path d="M3 14a2 2 0 002 2h2v-6H5a2 2 0 00-2 2v2zM21 14a2 2 0 01-2 2h-2v-6h2a2 2 0 012 2v2z" />
    </svg>
  );
}

export function WalkingIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M14 4l-2 6 4 4-4 4 2 6" />
      <circle cx="14" cy="3" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function HomeIcon({
  size = 24,
  filled = false,
  ...props
}: Omit<IconProps, 'filled'> & { filled?: boolean }) {
  // strip our custom prop before forwarding to <svg>
  const svgProps = props as SVGProps<SVGSVGElement>;
  return (
    <svg
      {...baseProps(size)}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 1 : 2}
      {...svgProps}
    >
      <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z" />
    </svg>
  );
}

export function LibraryIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} strokeWidth={2.4} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function ProfileIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function FlameIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} fill="currentColor" stroke="none" {...props}>
      <path d="M12 2c0 4-3 5-3 8a3 3 0 006 0c0-1.5-1-2.5-1-2.5s2 1.5 2 4.5a6 6 0 11-12 0c0-3 4-5 4-10 0 0 4 0 4 0z" />
    </svg>
  );
}

/**
 * Filled heart for the lives indicator. The shape is a single bezier loop
 * with a slight asymmetry so it reads as drawn, not generated.
 */
export function HeartIcon({
  size = 18,
  filled = true,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...baseProps(size)}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 0 : 2}
      {...props}
    >
      <path d="M12 21s-7-4.5-9.3-9C1.4 8.5 3 5 6.4 5c1.9 0 3.5 1 4.6 2.6.4.5 1.1.5 1.5 0C13.6 6 15.2 5 17 5c3.4 0 5 3.5 3.7 7-2.3 4.5-9.3 9-9.3 9z" />
    </svg>
  );
}

/** Five-pointed star for the level-completion award. */
export function StarIcon({
  size = 28,
  filled = true,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...baseProps(size)}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 0 : 2}
      {...props}
    >
      <path d="M12 2.5l2.9 6.4 7 .8-5.2 4.7 1.5 6.9L12 17.7l-6.2 3.6 1.5-6.9L2.1 9.7l7-.8L12 2.5z" />
    </svg>
  );
}

/**
 * Compass with a tilted arrow — used for spatial-awareness modules
 * (Neglect category) where the user needs to explore the world around them.
 */
export function CompassIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5l-2 5.5-5.5 2 2-5.5 5.5-2z" />
    </svg>
  );
}

/** Hand with extended index finger — touch / swipe interaction. */
export function HandIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <path d="M9 11V5.5a1.5 1.5 0 013 0V11" />
      <path d="M12 11V4a1.5 1.5 0 013 0v7" />
      <path d="M15 11V6a1.5 1.5 0 013 0v9c0 3.5-2 6-5.5 6S7 18.5 7 16v-2c0-1 .3-2 1-2.5l1-1V8a1.5 1.5 0 013 0v3" />
    </svg>
  );
}

/** Phone tilting with motion arcs — gyroscope / device-orientation control. */
export function DeviceTiltIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...baseProps(size)} {...props}>
      <rect x="8" y="3" width="8" height="14" rx="1.5" transform="rotate(-15 12 10)" />
      <path d="M3 14c0-3 1.5-5 4-6" />
      <path d="M21 14c0-3-1.5-5-4-6" />
    </svg>
  );
}

/* ----- module icon resolver ----- */
import type { ComponentType } from 'react';

export const moduleIconMap: Record<string, ComponentType<IconProps>> = {
  crossword: CrosswordIcon,
  image: ImageRecognitionIcon,
  audiobook: AudiobookIcon,
  walk: WalkingIcon,
  compass: CompassIcon,
};
