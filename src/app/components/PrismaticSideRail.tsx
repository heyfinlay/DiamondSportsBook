import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@lib/utils/cn";

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

export const PrismaticSideRail = ({
  title,
  subtitle,
  items,
  activeKey,
  ctaLabel,
  ctaTo
}: PrismaticSideRailProps) => {
  return (
    <aside className="prismatic-card sticky top-28 hidden h-fit overflow-hidden xl:flex xl:w-[17rem] xl:flex-col">
      <div className="border-b border-white/5 px-6 py-6">
        <p className="font-headline text-sm font-extrabold uppercase tracking-[0.14em] text-white">
          {title}
        </p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-primary-dim">
          {subtitle}
        </p>
      </div>

      <nav className="flex flex-col py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const className = cn(
            "flex min-h-[4rem] items-center gap-4 border-l-2 px-6 font-label text-xs uppercase tracking-[0.15em] transition",
            activeKey === item.key
              ? "border-primary-container bg-surface text-primary-container"
              : "border-transparent text-on-subtle hover:bg-surface-low hover:text-white"
          );

          if (item.to) {
            return (
              <Link key={item.key} to={item.to} className={className}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <div key={item.key} className={className}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 px-5 py-5">
        {ctaLabel && ctaTo ? (
          <Link to={ctaTo} className="prismatic-button prismatic-button-primary w-full">
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </aside>
  );
};

export default PrismaticSideRail;
