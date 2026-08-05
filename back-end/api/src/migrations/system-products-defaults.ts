/**
 * System climate products shipped with Climsoft.
 *
 * Each entry maps to a Superset dashboard ZIP committed in superset/products/.
 * The supersetUuid MUST match the UUID baked into the corresponding ZIP.
 * When authoring a new dashboard, set its UUID in Superset to the value here
 * before exporting it, so the seed and the ZIP stay in sync.
 *
 * To add a new shipped product:
 * 1. Generate a UUID and add an entry below.
 * 2. In Superset, edit the dashboard settings and set its UUID to match.
 * 3. Export the dashboard as a ZIP to superset/products/<systemKey>.zip.
 * 4. Commit both the ZIP and this file.
 */
export interface SystemProductSeed {
    systemKey: string;
    supersetUuid: string;
    name: string;
    description: string | null;
    category: string | null;
}

export const SYSTEM_PRODUCTS: SystemProductSeed[] = [
    {
        systemKey: 'stations_overview',
        supersetUuid: '661fab3c-49e6-4a06-92af-7e5b13159d7c',
        name: 'Stations Overview',
        description: 'Interactive map and directory of all monitoring stations.',
        category: 'Network Management',
    },
    {
        systemKey: 'data_availability',
        supersetUuid: 'a2d068da-ae6e-4987-9af6-c83277900c88',
        name: 'Data Availability',
        description: 'Monthly completeness and QC status by station and element.',
        category: 'Data Quality',
    },
    {
        systemKey: 'observations_explorer',
        supersetUuid: 'bcbab172-fd08-4920-a2d7-49ebf02c4697',
        name: 'Observations Explorer',
        description: 'Browse and filter raw observation records across all stations.',
        category: 'Data Exploration',
    },
    {
        systemKey: 'daily_climate',
        supersetUuid: '3739e396-cff4-4524-8cdb-13ce138669ef',
        name: 'Daily Climate Summary',
        description: 'Daily aggregates (mean, max, min, total) per station and element.',
        category: 'Data Exploration',
    },
    {
        systemKey: 'monthly_climate',
        supersetUuid: '79deede1-da9a-473f-a5fb-baf2d83eb101',
        name: 'Monthly Climate Summary',
        description: 'Monthly aggregates and QC statistics per station and element.',
        category: 'Data Exploration',
    },
    {
        systemKey: 'climate_extremes',
        supersetUuid: 'de8f35d9-6a42-438e-9c41-e68aba418efd',
        name: 'Climate Extremes',
        description: 'Annual maximum, minimum, mean and percentiles per station and element.',
        category: 'Climate Analysis',
    },
];
