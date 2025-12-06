export interface OutcomeTileProps {
    id: string;
    teamCode: string;
    teamName: string;
    teamColor?: string;
    driverNumber?: string | number | null;
    driverName: string;
    oddsLabel: string;
    poolShareLabel: string;
    isFavourite?: boolean;
    isBestPayout?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}
export declare function OutcomeTile({ id, teamCode, teamName, teamColor, driverNumber, driverName, oddsLabel, poolShareLabel, isFavourite, isBestPayout, isSelected, onSelect }: OutcomeTileProps): import("react/jsx-runtime").JSX.Element;
