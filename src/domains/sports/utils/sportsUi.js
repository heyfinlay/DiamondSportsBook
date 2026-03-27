export const getSportLabel = (sportCode) => {
    switch (sportCode) {
        case "f1":
            return "Formula 1";
        case "nrl":
            return "NRL";
        case "afl":
            return "AFL";
        case "mma":
            return "MMA";
        case "soccer":
            return "Soccer";
        default:
            return "Sports";
    }
};
export const getSportAccentClass = (sportCode) => {
    switch (sportCode) {
        case "mma":
            return "text-danger";
        case "soccer":
            return "text-emerald-300";
        case "nrl":
            return "text-cyan-300";
        case "afl":
            return "text-primary-fixed";
        case "f1":
        default:
            return "text-primary-container";
    }
};
export const getSportSurfaceClass = (sportCode) => {
    switch (sportCode) {
        case "mma":
            return "from-danger/14 via-surface-low to-surface-lowest";
        case "soccer":
            return "from-emerald-400/14 via-surface-low to-surface-lowest";
        case "nrl":
            return "from-cyan-400/14 via-surface-low to-surface-lowest";
        case "afl":
            return "from-primary-fixed/14 via-surface-low to-surface-lowest";
        case "f1":
        default:
            return "from-primary-container/14 via-surface-low to-surface-lowest";
    }
};
export const getSportWatermark = (sportCode) => {
    switch (sportCode) {
        case "f1":
            return "GRID";
        case "nrl":
            return "ROUND";
        case "afl":
            return "MATCH";
        case "mma":
            return "CARD";
        case "soccer":
            return "FIXTURE";
        default:
            return "LIVE";
    }
};
