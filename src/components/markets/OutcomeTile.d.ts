export interface OutcomeTileProps {
    outcomeId: string;
    shortLabel: string;
    primaryLabel: string;
    secondaryLabel?: string;
    accentColor?: string;
    oddsLabel: string;
    poolShareLabel: string;
    poolSharePercent: number;
    isFavourite?: boolean;
    isBestPayout?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}
export declare function OutcomeTile({ shortLabel, primaryLabel, secondaryLabel, accentColor, oddsLabel, poolShareLabel, poolSharePercent, isFavourite, isBestPayout, isSelected, onSelect }: OutcomeTileProps): import("react/jsx-runtime").JSX.Element;
