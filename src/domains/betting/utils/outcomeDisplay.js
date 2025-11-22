const DEFAULT_OUTCOME_COLOR = "#64748b";
export const buildOutcomeIdentity = ({ teamName, driverName, fallbackLabel, teamColor }) => {
    const normalizedTeam = teamName?.trim() || null;
    const normalizedDriver = driverName?.trim() || null;
    const primaryLabel = normalizedTeam ?? normalizedDriver ?? fallbackLabel;
    const secondaryLabel = normalizedDriver && normalizedDriver !== primaryLabel ? normalizedDriver : null;
    return {
        primaryLabel,
        secondaryLabel,
        color: teamColor?.trim() || DEFAULT_OUTCOME_COLOR
    };
};
