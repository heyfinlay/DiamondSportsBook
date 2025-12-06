export const extractDriverNumber = (driverName?: string | null): string | null => {
  if (!driverName) return null;
  const match = driverName.match(/^(\d{1,3})\b/);
  if (match) return match[1];
  return null;
};
