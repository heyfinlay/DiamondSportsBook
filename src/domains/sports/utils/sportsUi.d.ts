import type { SportCode } from "../api/sportsDataApi";
export declare const getSportLabel: (sportCode?: SportCode | null) => "Formula 1" | "NRL" | "AFL" | "MMA" | "Soccer" | "Sports";
export declare const getSportAccentClass: (sportCode?: SportCode | null) => "text-primary-container" | "text-primary-fixed" | "text-cyan-300" | "text-danger" | "text-emerald-300";
export declare const getSportSurfaceClass: (sportCode?: SportCode | null) => "from-danger/14 via-surface-low to-surface-lowest" | "from-emerald-400/14 via-surface-low to-surface-lowest" | "from-cyan-400/14 via-surface-low to-surface-lowest" | "from-primary-fixed/14 via-surface-low to-surface-lowest" | "from-primary-container/14 via-surface-low to-surface-lowest";
export declare const getSportWatermark: (sportCode?: SportCode | null) => "GRID" | "ROUND" | "MATCH" | "CARD" | "FIXTURE" | "LIVE";
