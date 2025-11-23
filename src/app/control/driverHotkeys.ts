import type { DriverStanding } from "@domains/timing/api/timingApi";

/**
 * Match a keyboard key to a driver via their stable car/driver number.
 */
export const findDriverByNumberHotkey = (drivers: DriverStanding[], key: string) => {
  const parsedKey = Number.parseInt(key, 10);
  if (Number.isNaN(parsedKey)) return undefined;
  return drivers.find((driver) => driver.car_number === parsedKey);
};
