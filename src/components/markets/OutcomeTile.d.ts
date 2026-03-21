export interface OutcomeTileProps {
    outcomeId: string;
    teamCode: string;
    teamName: string;
    teamColor?: string;
    driverName: string;
    oddsLabel: string;
    poolShareLabel: string;
    poolSharePercent: number;
    isFavourite?: boolean;
    isBestPayout?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}
export declare function OutcomeTile({ teamCode, teamName, teamColor, driverName, oddsLabel, poolShareLabel, poolSharePercent, isFavourite, isBestPayout, isSelected, onSelect }: OutcomeTileProps): import("react/jsx-runtime").JSX.Element;
