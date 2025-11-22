import { cn } from "@lib/utils/cn";

const DEFAULT_SWATCH_COLOR = "#64748b";

interface OutcomeIdentityProps {
  teamName?: string | null;
  driverName?: string | null;
  teamColor?: string | null;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  hideSwatch?: boolean;
  align?: "start" | "end";
}

export const OutcomeIdentity = ({
  teamName,
  driverName,
  teamColor,
  className,
  primaryClassName,
  secondaryClassName,
  hideSwatch = false,
  align = "start"
}: OutcomeIdentityProps) => {
  const primary = teamName?.trim() || driverName?.trim() || "—";
  const normalizedDriver = driverName?.trim();
  const secondary =
    normalizedDriver && normalizedDriver !== primary ? normalizedDriver : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "end" && "justify-end text-right",
        className
      )}
    >
      {!hideSwatch && (
        <span
          className="h-2.5 w-2.5 rounded-full border border-white/20"
          style={{ backgroundColor: teamColor ?? DEFAULT_SWATCH_COLOR }}
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col leading-tight">
        <span className={cn("text-sm font-semibold text-white", primaryClassName)}>
          {primary}
        </span>
        {secondary ? (
          <span className={cn("text-xs text-white/60", secondaryClassName)}>
            {secondary}
          </span>
        ) : null}
      </div>
    </div>
  );
};
