export type StandingsTabOption = {
    key: string;
    label: string;
    subtitle?: string;
};
type StandingsTabsProps = {
    tabs: StandingsTabOption[];
    activeKey: string;
    onChange: (key: string) => void;
};
declare const StandingsTabs: ({ tabs, activeKey, onChange }: StandingsTabsProps) => import("react/jsx-runtime").JSX.Element;
export default StandingsTabs;
