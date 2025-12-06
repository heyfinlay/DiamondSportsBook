export const getMarketCloseLabel = (closeAt?: string | Date | null): string => {
  if (!closeAt) return "No scheduled close";
  const closeDate = typeof closeAt === "string" ? new Date(closeAt) : closeAt;
  if (Number.isNaN(closeDate.getTime())) return "No scheduled close";

  const diffMs = closeDate.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes <= 0) return "Market closed";
  if (diffMinutes < 60) return `Closes in ${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) return `Closes in ${hours}h`;
  return `Closes in ${hours}h ${minutes}m`;
};

export const formatMarketCloseAbsolute = (closeAt?: string | Date | null): string | null => {
  if (!closeAt) return null;
  const closeDate = typeof closeAt === "string" ? new Date(closeAt) : closeAt;
  if (Number.isNaN(closeDate.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(closeDate);
};
