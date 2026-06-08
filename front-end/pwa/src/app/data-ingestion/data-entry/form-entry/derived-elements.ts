/**
 * Calculates dew point temperature from dry bulb and wet bulb temperatures.
 * @param dryBulb - Dry bulb temperature in Celsius (number or null)
 * @param wetBulb - Wet bulb temperature in Celsius (number or null)
 * @returns Dew point in Celsius, rounded to nearest integer, or null if any input is null/undefined
 */
export function calculateDewpoint(dryBulb: number | null | undefined, wetBulb: number | null | undefined): number | null {
    if (dryBulb == null || wetBulb == null) return null;

    const Td_Fahrenheit = 9 / 5 * dryBulb + 32;
    const Ed = 6.1078 * Math.exp((9.5939 * Td_Fahrenheit - 307.004) / (0.556 * Td_Fahrenheit + 219.522));
    const Tw_Fahrenheit = 9 / 5 * wetBulb + 32;
    const Ew = 6.1078 * Math.exp((9.5939 * Tw_Fahrenheit - 307.004) / (0.556 * Tw_Fahrenheit + 219.522));
    const Ea = Ew - 0.35 * (Td_Fahrenheit - Tw_Fahrenheit);
    const Tp_Fahrenheit = -(Math.log(Ea / 6.1078) * 219.522 + 307.004) / (Math.log(Ea / 6.1078) * 0.556 - 9.59539);
    const Tp_Celsius = 5 / 9 * (Tp_Fahrenheit - 32);
    return Math.round(Tp_Celsius);
}

/**
 * Calculates relative humidity from dew point and dry bulb temperatures.
 * @param dewPoint - Dew point temperature in Celsius (number or null)
 * @param dryBulb - Dry bulb temperature in Celsius (number or null)
 * @returns Relative humidity in percent, rounded to nearest integer, or null if any input is null/undefined
 */
export function calculateRH(dewPoint: number | null | undefined, dryBulb: number | null | undefined): number | null {
    if (dewPoint == null || dryBulb == null) return null;

    const svp1 = 6.11 * Math.pow(10, (7.5 * dewPoint) / (237.3 + dewPoint));
    const svp2 = 6.11 * Math.pow(10, (7.5 * dryBulb) / (237.3 + dryBulb));
    return Math.round((svp1 / svp2) * 100);
}

/**
 * Calculates geopotential height.
 * @param ppp - Pressure (number or null)
 * @param dryBulb - Dry bulb temperature in Celsius (number or null)
 * @param elevation - Elevation in meters (number or null)
 * @param gpmStdLevel - Standard pressure level (number or null)
 * @returns Geopotential height, rounded to nearest integer, or null if any input is null/undefined
 */
export function calculateGeopotential(
    ppp: number | null | undefined,
    dryBulb: number | null | undefined,
    elevation: number | null | undefined,
    gpmStdLevel: number | null | undefined
): number | null {
    if (ppp == null || dryBulb == null || elevation == null || gpmStdLevel == null) return null;

    const gamma = 0.0065;
    const g = 9.80665;
    const R = 287.04;
    const K = dryBulb + 273.15;
    const logTerm = Math.log(ppp / gpmStdLevel);
    const numerator = elevation + (R / g) * logTerm * (K + (gamma / 2) * elevation);
    const denominator = 1 + (R / g) * logTerm * (gamma / 2);
    return Math.round(numerator / denominator);
}

/**
 * Calculates mean sea level pressure.
 * @param ppp - Pressure (number or null)
 * @param dryBulb - Dry bulb temperature in Celsius (number or null)
 * @param elevation - Elevation in meters (number or null)
 * @returns Mean sea level pressure (multiplied by 10 as in original), or null if any input is null/undefined
 */
export function calculateMSLppp(
    ppp: number | null | undefined,
    dryBulb: number | null | undefined,
    elevation: number | null | undefined
): number | null {
    if (ppp == null || dryBulb == null || elevation == null) return null;

    const gamma = 0.0065;
    const base = 1 - gamma * elevation / (dryBulb + gamma * elevation + 273.15);
    return ppp * Math.pow(base, -5.257) * 10;
}