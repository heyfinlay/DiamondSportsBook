import { cn } from "@lib/utils/cn";

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

const StandingsTabs = ({ tabs, activeKey, onChange }: StandingsTabsProps) => {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/40 p-1 text-sm font-medium">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex flex-1 flex-col rounded-xl px-4 py-3 text-left transition md:flex-none",
              isActive
                ? "bg-white text-black shadow"
                : "text-white/70 hover:text-white"
            )}
          >
            <span>{tab.label}</span>
            {tab.subtitle ? (
              <span className="text-xs font-normal text-white/60">{tab.subtitle}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export default StandingsTabs;
