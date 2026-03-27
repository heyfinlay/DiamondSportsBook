interface OutcomeIdentityProps {
    primaryLabel?: string | null;
    secondaryLabel?: string | null;
    accentColor?: string | null;
    className?: string;
    primaryClassName?: string;
    secondaryClassName?: string;
    hideSwatch?: boolean;
    align?: "start" | "end";
}
export declare const OutcomeIdentity: ({ primaryLabel, secondaryLabel, accentColor, className, primaryClassName, secondaryClassName, hideSwatch, align }: OutcomeIdentityProps) => import("react/jsx-runtime").JSX.Element;
export {};
