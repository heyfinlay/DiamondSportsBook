import React from "react";
import type { PoolStatus } from "../../features/markets/types";
interface RightMeta {
    status?: PoolStatus;
    statusLabel?: string;
    statusClassName?: string;
    badgeContent?: React.ReactNode;
}
interface MarketHeroCardProps {
    label: string;
    title: string;
    description: React.ReactNode;
    rightMeta?: RightMeta;
    subLabel?: string | null;
}
export declare function MarketHeroCard({ label, title, description, rightMeta, subLabel }: MarketHeroCardProps): import("react/jsx-runtime").JSX.Element;
export {};
