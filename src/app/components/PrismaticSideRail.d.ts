import type { LucideIcon } from "lucide-react";
export interface PrismaticRailItem {
    key: string;
    label: string;
    icon: LucideIcon;
    to?: string;
}
interface PrismaticSideRailProps {
    title: string;
    subtitle: string;
    items: PrismaticRailItem[];
    activeKey: string;
    ctaLabel?: string;
    ctaTo?: string;
}
export declare const PrismaticSideRail: ({ title, subtitle, items, activeKey, ctaLabel, ctaTo }: PrismaticSideRailProps) => import("react/jsx-runtime").JSX.Element;
export default PrismaticSideRail;
