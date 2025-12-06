export interface OutcomeTileProps {
    outcomeId: string;
    teamCode: string;
    teamName: string;
    teamColor?: string;
    driverName: string;
    oddsLabel: string;
    poolShareLabel: string;
    isFavourite?: boolean;
    isBestPayout?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}
export declare function OutcomeTile({ outcomeId, teamCode, teamName, teamColor, driverName, oddsLabel, poolShareLabel, isFavourite, isBestPayout, isSelected, onSelect }: OutcomeTileProps): import("react/jsx-runtime").JSX.Element;
