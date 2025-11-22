const DEFAULT_OUTCOME_COLOR = "#64748b";

export interface OutcomeIdentityInput {
  teamName?: string | null;
  driverName?: string | null;
  fallbackLabel: string;
  teamColor?: string | null;
}

export interface OutcomeIdentity {
  primaryLabel: string;
  secondaryLabel: string | null;
  color: string;
}

export const buildOutcomeIdentity = ({
  teamName,
  driverName,
  fallbackLabel,
  teamColor
}: OutcomeIdentityInput): OutcomeIdentity => {
  const normalizedTeam = teamName?.trim() || null;
  const normalizedDriver = driverName?.trim() || null;
  const primaryLabel = normalizedTeam ?? normalizedDriver ?? fallbackLabel;
  const secondaryLabel =
    normalizedDriver && normalizedDriver !== primaryLabel ? normalizedDriver : null;

  return {
    primaryLabel,
    secondaryLabel,
    color: teamColor?.trim() || DEFAULT_OUTCOME_COLOR
  };
};
