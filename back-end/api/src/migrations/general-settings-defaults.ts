import { ViewGeneralSettingModel } from "src/settings/dtos/view-general-setting.model";
import { ClimsoftBoundaryDto } from "src/settings/dtos/settings/climsoft-boundary.dto";
import { ClimsoftDisplayTimeZoneDto } from "src/settings/dtos/settings/climsoft-display-timezone.dto";
import { SchedulerSettingDto } from "src/settings/dtos/settings/scheduler-setting.dto";

export const DEFAULT_GENERAL_SETTINGS: ViewGeneralSettingModel[] = [
    {
        id: 1,
        name: 'Climsoft boundary',
        description: 'The default geographical boundary coordinates that Climsoft manages data and zoom level that the map will center on when it is first loaded.',
        parameters: {
            longitude: 37.59162,
            latitude: 0.36726,
            zoomLevel: 6
        } as ClimsoftBoundaryDto
    },
    {
        id: 2,
        name: 'Display time zone',
        description: 'Time zone used by climsoft front end for data querying and display.',
        parameters: {
            utcOffset: 0,
        } as ClimsoftDisplayTimeZoneDto
    },
    {
        id: 3,
        name: 'Scheduler',
        description: 'Settings related to the scheduler that runs the connectors, QC, cleaning up of stale files and alerts.',
        parameters: {
            // Snapshots, not days. A connector run records the whole file
            // server it points at, so five snapshots is the storage bound
            // regardless of whether the connector runs hourly or weekly.
            // `attemptDays` covers the other kind of row: runs that never
            // reached the server, which hold nothing but are worth seeing.
            connectorRunCleanup: { cronSchedule: '0 3 * * *', keepLast: 5, attemptDays: 7 },
            // Orphaned operation directories only — anything a run file still
            // references is skipped whatever its age — so this can be short.
            fileCleanup: { cronSchedule: '0 4 * * *', daysOld: 1 },
        } as SchedulerSettingDto
    },

];