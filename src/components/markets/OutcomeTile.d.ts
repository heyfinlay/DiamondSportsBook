export interface OutcomeTileProps {
    id: string;
    shortName: string;
    fullName: string;
    teamColor?: string;
    oddsLabel: string;
    poolShareLabel: string;
    isFavourite?: boolean;
    isBestPayout?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
}
export declare function OutcomeTile({ id, shortName, fullName, teamColor, oddsLabel, poolShareLabel, isFavourite, isBestPayout, isSelected, onSelect }: OutcomeTileProps): import("react/jsx-runtime").JSX.Element;
