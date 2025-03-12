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
    DATA_EXTRACTION = 'Data Extraction',
    METADATA = 'Metadata',
    SYSTEM_ADMINISTRATOR = 'System Administrator',
}

export enum SubMenuNameEnum {
    DATA_ENTRY = 'Data Entry',
    MANUAL_IMPORT = 'Manual Import',
    SCHEDULED_IMPORT = 'Scheduled Import',
    DATA_CORRECTION = 'Data Correction',
    DELETED_DATA = 'Deleted Data',
    MISSING_DATA = 'Missing Data',
    QC_DATA = 'Quality Control',
    DATA_MONITORING = 'Data Monitoring',

    MANUAL_EXPORT = 'Manual Export',
    SCHEDULED_EXPORT = 'Scheduled Export',

    ELEMENTS = 'Elements',
    STATIONS = 'Stations',
    REGIONS = 'Regions',
    SOURCE_TEMPLATES = 'Source Templates',
    EXPORT_TEMPLATES = 'Export Templates',
    INTEGRATION_CONNECTORS = 'Integration Connectors',

    USER_GROUPS = 'User Groups',
    USERS = 'Users',
    CLIMSOFT_V4 = 'Climsoft V4',
    SETTINGS = 'Settings',
    AUDIT_LOGS = 'Audit Logs',
}

export class MenuItemsUtil {

    public static get DATA_INGESTION_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.DATA_INGESTION,
            url: '/data-ingestion',
            icon: 'bi bi-file-earmark-text',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.DATA_ENTRY,
                    url: '/station-form-selection',
                },
                {
                    name: SubMenuNameEnum.MANUAL_IMPORT,
                    url: '/manual-import-selection',
                },
                {
                    name: SubMenuNameEnum.SCHEDULED_IMPORT,
                    url: '/auto-import-selection',
                },
                {
                    name: SubMenuNameEnum.DATA_CORRECTION,
                    url: '/data-correction',
                },
                {
                    name: SubMenuNameEnum.MISSING_DATA,
                    url: '/missing-data',
                },
                {
                    name: SubMenuNameEnum.QC_DATA,
                    url: '/quality-control',
                },
                {
                    name: SubMenuNameEnum.DATA_MONITORING,
                    url: '/data-monitoring',
                },
                {
                    name: SubMenuNameEnum.DELETED_DATA,
                    url: '/deleted-data',
                },
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
                {
                    name: SubMenuNameEnum.SCHEDULED_EXPORT,
                    url: '/auto-export-selection',
                },
            ]
        };
    }

    public static get METADATA_MENU_ITEMS(): MenuItem {
        return {
            name: MainMenuNameEnum.METADATA,
            url: '/metadata',
            icon: 'bi bi-chat-dots',
            open: false,
            children: [
                {
                    name: SubMenuNameEnum.ELEMENTS,
                    url: '/view-elements',
                },
                {
                    name: SubMenuNameEnum.STATIONS,
                    url: '/view-stations',
                },
                {
                    name: SubMenuNameEnum.REGIONS,
                    url: '/view-regions',
                },
                {
                    name: SubMenuNameEnum.SOURCE_TEMPLATES,
                    url: '/view-sources',
                },
                {
                    name: SubMenuNameEnum.EXPORT_TEMPLATES,
                    url: '/view-exports',
                },
                {
                    name: SubMenuNameEnum.INTEGRATION_CONNECTORS,
                    url: '/view-connectors',
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

            ]
        }
    }
}










