interface OutcomeIdentityProps {
    teamName?: string | null;
    driverName?: string | null;
    teamColor?: string | null;
    className?: string;
    primaryClassName?: string;
    secondaryClassName?: string;
    hideSwatch?: boolean;
    align?: "start" | "end";
}
export declare const OutcomeIdentity: ({ teamName, driverName, teamColor, className, primaryClassName, secondaryClassName, hideSwatch, align }: OutcomeIdentityProps) => import("react/jsx-runtime").JSX.Element;
export {};
