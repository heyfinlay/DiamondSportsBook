import type { SportCode } from "../api/sportsDataApi";
export declare const getSportLabel: (sportCode?: SportCode | null) => "NRL" | "AFL" | "MMA" | "Soccer" | "Formula 1" | "Sports";
export declare const getSportAccentClass: (sportCode?: SportCode | null) => "text-primary-fixed" | "text-danger" | "text-emerald-300" | "text-cyan-300" | "text-primary-container";
export declare const getSportSurfaceClass: (sportCode?: SportCode | null) => "from-danger/14 via-surface-low to-surface-lowest" | "from-emerald-400/14 via-surface-low to-surface-lowest" | "from-cyan-400/14 via-surface-low to-surface-lowest" | "from-primary-fixed/14 via-surface-low to-surface-lowest" | "from-primary-container/14 via-surface-low to-surface-lowest";
export declare const getSportWatermark: (sportCode?: SportCode | null) => "GRID" | "ROUND" | "MATCH" | "CARD" | "FIXTURE" | "LIVE";
