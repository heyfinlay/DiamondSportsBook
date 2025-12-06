import type { DriverStanding } from "@domains/timing/api/timingApi";
type RaceOrderPanelProps = {
    entries: DriverStanding[];
    onReorder: (updates: Array<{
        driverId: string;
        displayPosition: number | null;
    }>) => Promise<void> | void;
    onUpdateBestLap: (driverId: string, bestLapMs: number | null) => Promise<void> | void;
    onUpdateStatus: (driverId: string, status: string) => Promise<void> | void;
    disabled?: boolean;
    savingOrder?: boolean;
    savingLap?: boolean;
    statusUpdating?: boolean;
    notify: (options: {
        title: string;
        description?: string;
        variant?: "success" | "error" | "default";
    }) => void;
};
declare const RaceOrderPanel: ({ entries, onReorder, onUpdateBestLap, onUpdateStatus, disabled, savingOrder, savingLap, statusUpdating, notify }: RaceOrderPanelProps) => import("react/jsx-runtime").JSX.Element;
export default RaceOrderPanel;
