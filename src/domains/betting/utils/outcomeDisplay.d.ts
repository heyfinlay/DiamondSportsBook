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
export declare const buildOutcomeIdentity: ({ teamName, driverName, fallbackLabel, teamColor }: OutcomeIdentityInput) => OutcomeIdentity;
