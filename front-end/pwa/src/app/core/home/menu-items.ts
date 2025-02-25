/**
 * File for all feature menu items
 */

export type mainMenus = 'Dashboard' | 'Data Acquisition' | 'Data Extraction' | 'Metadata' | 'Admin';
export interface MenuItem {
    name: mainMenus;
    url: string;
    icon: string;
    open: boolean;
    children: { name: string, url: string }[];
}
// Holds the features navigation items
export const FEATURES_MENU_ITEMS: MenuItem[] = [
    {
        name: 'Dashboard',
        url: '/dashboard',
        icon: 'bi bi-sliders',
        open: false,
        children: []
    },
    {
        name: 'Data Acquisition',
        url: '/data-acquisition',
        icon: 'bi bi-file-earmark-text',
        open: false,
        children: [
            {
                name: 'Data Entry',
                url: '/station-form-selection',
            },
            {
                name: 'Manual Import',
                url: '/manual-import-selection',
            },
            {
                name: 'Auto Import',
                url: '/auto-import-selection',
            },
            {
                name: 'Data Correction',
                url: '/data-correction',
            },
            {
                name: 'Deleted Data',
                url: '/deleted-data',
            },
            {
                name: 'Missing Data',
                url: '/missing-data',
            },
            {
                name: 'Quality Control',
                url: '/quality-control',
            },

        ]
    },
    {
        name: 'Data Extraction',
        url: '/data-extraction',
        icon: 'bi bi-file-earmark-text',
        open: false,
        children: [
            {
                name: 'Manual Export',
                url: '/manual-export-selection',
            },
            {
                name: 'Auto Export',
                url: '/auto-export-selection',
            },
        ]
    },
    {
        name: 'Metadata',
        url: '/metadata',
        icon: 'bi bi-chat-dots',
        open: false,
        children: [
            {
                name: 'Elements',
                url: '/view-elements',
            },
            {
                name: 'Stations',
                url: '/view-stations',
            },
            {
                name: 'Regions',
                url: '/view-regions',
            },
            {
                name: 'Sources',
                url: '/view-sources',
            },
            {
                name: 'Exports',
                url: '/view-exports',
            },
            {
                name: 'Connectors',
                url: '/view-connectors',
            },
        ]
    },
    {
        name: 'Admin',
        url: '/admin',
        icon: 'bi bi-gear',
        open: false,
        children: [
            {
                name: 'Users',
                url: '/view-users',
            },
            {
                name: 'Climsoft V4',
                url: '/climsoft-v4',
            },
            {
                name: 'Settings',
                url: '/view-general-settings',
            },
            {
                name: 'Audits',
                url: '/view-audits',
            },

        ]
    },


];