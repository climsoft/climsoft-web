/**
 * File for all feature menu items
 */

export interface MenuItem {
    name: MainMenuNameEnum;
    url: string;
    icon: string;
    open: boolean;
    children: { name: SubMenuNameEnum, url: string }[];
}

export enum MainMenuNameEnum {
    DASHBOARD = 'Dashboard',
    DATA_INGESTION = 'Data Ingestion',
    DATA_MONITORING = 'Data Monitoring',
    QUALITY_CONTROL = 'Quality Control',
    DATA_EXTRACTION = 'Data Extraction',
    METADATA = 'Metadata',
    SYSTEM_ADMINISTRATOR = 'System Administrator',
}

export enum SubMenuNameEnum {
    DATA_ENTRY = 'Data Entry',
    MANUAL_IMPORT = 'Manual Import',
    //SCHEDULED_IMPORT = 'Scheduled Import',
    DATA_CORRECTION = 'Data Correction',
    DELETED_DATA = 'Deleted Data',

    STATION_STATUS = 'Station Status',
    DATA_FLOW = 'Data Flow',
    DATA_AVAILABILTY = 'Data Availabilty',
    DATA_EXPLORER = 'Data Explorer',

    SOURCE_CHECKS = 'Source Checks',
    QC_ASSESSMENT = 'QC Assessment',
    //SCHEDULED_QC_TESTS = 'Scheduled QC Tests',

    MANUAL_EXPORT = 'Manual Export',
    //SCHEDULED_EXPORT = 'Scheduled Export',

    ELEMENTS = 'Elements',
    ORGANISATIONS = 'Organisations',
    NETWORK_AFFILIATIONS = 'Network Affiliations',
    REGIONS = 'Regions',
    STATIONS = 'Stations',
    QC_SPECIFICATIONS = 'QC Specifications',
    SOURCE_SPECIFICATIONS = 'Source Specifications',
    EXPORT_SPECIFICATIONS = 'Export Specifications',
    CONNECTOR_SPECIFICATIONS = 'Connector Specifications',

    USER_GROUPS = 'User Groups',
    USERS = 'Users',
    CLIMSOFT_V4 = 'Climsoft V4',
    SETTINGS = 'Settings',
    AUDIT_LOGS = 'Audit Logs',
    JOB_QUEUE = 'Job Queue',
    CONNECTOR_LOGS = 'Connector Logs',
}

export class MenuItemsUtil {

    public static get DATA_INGESTION_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.DATA_INGESTION,
            url: '/data-ingestion',
            icon: 'bi bi-file-earmark-text',
            open: true, // By default, data ingestion to always be open. Helps with simplify the learning curve in data entry on mobile phones.
            children: [
                {
                    name: SubMenuNameEnum.DATA_ENTRY,
                    url: '/station-form-selection',
                },
                {
                    name: SubMenuNameEnum.MANUAL_IMPORT,
                    url: '/manual-import-selection',
                },
                // {
                //     name: SubMenuNameEnum.SCHEDULED_IMPORT,
                //     url: '/auto-import-selection',
                // },
                {
                    name: SubMenuNameEnum.DATA_CORRECTION,
                    url: '/data-correction',
                },
                {
                    name: SubMenuNameEnum.DELETED_DATA,
                    url: '/deleted-data',
                },
            ]
        }
    }

    public static get DATA_MONITORING_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.DATA_MONITORING,
            url: '/data-monitoring',
            icon: 'bi bi-activity',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.STATION_STATUS,
                    url: '/station-status',
                },
                {
                    name: SubMenuNameEnum.DATA_AVAILABILTY,
                    url: '/data-availability',
                },
                {
                    name: SubMenuNameEnum.DATA_EXPLORER,
                    url: '/data-explorer',
                },
                {
                    name: SubMenuNameEnum.DATA_FLOW,
                    url: '/data-flow',
                },
            ]
        }
    }

    public static get QUALITY_CONTROL_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.QUALITY_CONTROL,
            url: '/quality-control',
            icon: 'bi bi-shield-check',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.SOURCE_CHECKS,
                    url: '/source-checks',
                },
                {
                    name: SubMenuNameEnum.QC_ASSESSMENT,
                    url: '/qc-assessment',
                },
                // {
                //     name: SubMenuNameEnum.SCHEDULED_QC_TESTS,
                //     url: '/scheduled-qc-selection',
                // },
            ]
        }
    }

    public static get DATA_EXTRACTION_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.DATA_EXTRACTION,
            url: '/data-extraction',
            icon: 'bi bi-file-earmark-arrow-down',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.MANUAL_EXPORT,
                    url: '/manual-export-selection',
                },
                // {
                //     name: SubMenuNameEnum.SCHEDULED_EXPORT,
                //     url: '/auto-export-selection',
                // },
            ]
        };
    }

    public static get METADATA_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.METADATA,
            url: '/metadata',
            icon: 'bi bi-card-list',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.ELEMENTS,
                    url: '/view-elements',
                },
                {
                    name: SubMenuNameEnum.ORGANISATIONS,
                    url: '/view-organisations',
                },
                {
                    name: SubMenuNameEnum.NETWORK_AFFILIATIONS,
                    url: '/view-network-affiliations',
                },
                {
                    name: SubMenuNameEnum.REGIONS,
                    url: '/view-regions',
                },
                {
                    name: SubMenuNameEnum.STATIONS,
                    url: '/view-stations',
                },
                {
                    name: SubMenuNameEnum.QC_SPECIFICATIONS,
                    url: '/view-qc-test-specifications',
                },
                {
                    name: SubMenuNameEnum.SOURCE_SPECIFICATIONS,
                    url: '/view-source-specifications',
                },
                {
                    name: SubMenuNameEnum.EXPORT_SPECIFICATIONS,
                    url: '/view-export-specifications',
                },
                {
                    name: SubMenuNameEnum.CONNECTOR_SPECIFICATIONS,
                    url: '/view-connector-specifications',
                },
            ]
        }
    }

    public static get SYSTEM_ADMIN_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.SYSTEM_ADMINISTRATOR,
            url: '/admin',
            icon: 'bi bi-gear',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.USER_GROUPS,
                    url: '/view-user-groups',
                },
                {
                    name: SubMenuNameEnum.USERS,
                    url: '/view-users',
                },
                {
                    name: SubMenuNameEnum.CLIMSOFT_V4,
                    url: '/climsoft-v4',
                },
                {
                    name: SubMenuNameEnum.SETTINGS,
                    url: '/view-general-settings',
                },
                {
                    name: SubMenuNameEnum.AUDIT_LOGS,
                    url: '/view-audits',
                },
                {
                    name: SubMenuNameEnum.JOB_QUEUE,
                    url: '/view-job-queue',
                },
                {
                    name: SubMenuNameEnum.CONNECTOR_LOGS,
                    url: '/view-connector-logs',
                },

            ]
        }
    }
}










