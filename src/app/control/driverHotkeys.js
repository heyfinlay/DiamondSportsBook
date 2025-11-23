/**
 * Match a keyboard key to a driver via their stable car/driver number.
 */
export const findDriverByNumberHotkey = (drivers, key) => {
    const parsedKey = Number.parseInt(key, 10);
    if (Number.isNaN(parsedKey))
        return undefined;
    return drivers.find((driver) => driver.car_number === parsedKey);
};
