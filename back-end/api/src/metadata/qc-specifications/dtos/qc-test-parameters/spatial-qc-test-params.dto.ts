import { IsInt, IsNumber, Min } from 'class-validator';

/**
 * Spatial Consistency QC Test — Neighbour Mean Deviation Check
 *
 * Compares an observation's value against the mean of the same element observed at
 * neighbouring stations at the same datetime. Neighbours are found dynamically using
 * PostGIS distance calculations on the stations' location geometry column.
 *
 * Example — Temperature spatial check:
 *   maxDistanceKm: 50, minNeighbours: 3, maxDeviation: 5.0
 *
 *   Station A reports temperature = 45.2°C
 *   3 neighbouring stations within 50 km report: [24.8, 25.0, 25.5]
 *   Neighbour mean = 25.1°C
 *   Deviation = |45.2 - 25.1| = 20.1 > maxDeviation of 5.0 → FAIL
 *
 *   If only 2 neighbours are found (below minNeighbours of 3), the test is skipped
 *   (not enough evidence to flag the observation).
 *
 *   If Station A has no location set, the test is also skipped.
 */
export class SpatialQCTestParamsDto {
    /** Maximum distance in kilometres to search for neighbouring stations. Uses PostGIS ST_DWithin on geography type. */
    @IsNumber()
    @Min(0)
    maxDistanceKm: number;

    /** Minimum number of neighbouring stations with data required to perform the check. If fewer are found, the test is skipped. */
    @IsInt()
    @Min(1)
    minNeighbours: number;

    /** Maximum allowed absolute deviation from the neighbours' mean. If |observed - mean| > maxDeviation, the test fails. */
    @IsNumber()
    @Min(0)
    maxDeviation: number;
}
