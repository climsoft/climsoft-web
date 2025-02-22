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
        url: '/data-entry',
        icon: 'bi bi-file-earmark-text',
        open: false,
        children: [
            {
                name: 'Data Entry',
                url: '/station-form-selection',
            },
            {
                name: 'Manual Import',
                url: '/import-selection',
            },
            {
                name: 'Auto Import',
                url: '/import-selection',
            },
            {
                name: 'Data Correction',
                url: '/manage-data',
            },
            {
                name: 'Data Visualisation',
                url: '/manage-data',
            },           
            {
                name: 'Quality Control',
                url: '/manage-data',
            },
            {
                name: 'Deleted Data',
                url: '/manage-data',
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
                url: '/station-form-selection',
            },
            {
                name: 'Auto Export',
                url: '/auto-export',
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
                url: '/elements',
            },
            {
                name: 'Stations',
                url: '/stations',
            },
            {
                name: 'Regions',
                url: '/view-regions',
            },
            {
                name: 'Sources',
                url: '/sources',
            },
            {
                name: 'Exports',
                url: '/exports',
            },
            {
                name: 'Connectors',
                url: '/connectors',
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
                name: 'Audit',
                url: '/audit',
            },
         
        ]
    },


];