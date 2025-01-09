/**
 * File for all feature menu items
 */

export type mainMenus = 'Dashboard' | 'Data Entry' | 'Metadata' | 'Users' | 'Settings';
export interface MenuItem {
    name: mainMenus;
    url: string;
    icon: string;
    open: boolean;
    children: { name: string, url: string, featureTitle: string }[];
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
        name: 'Data Entry',
        url: '/data-entry',
        icon: 'bi bi-file-earmark-text',
        open: false,
        children: [
            {
                name: 'Forms',
                url: '/station-form-selection',
                featureTitle: 'Form Data Entry'
            },
            {
                name: 'Import',
                url: '/import-selection',
                featureTitle: 'Import Data Entry'
            },
            {
                name: 'Manage Data',
                url: '/manage-data',
                featureTitle: 'View Entries'
            }
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
                featureTitle: 'Elements'
            },
            {
                name: 'Stations',
                url: '/stations',
                featureTitle: 'Stations'
            },
            {
                name: 'Regions',
                url: '/view-regions',
                featureTitle: 'Regions'
            },
            {
                name: 'Sources',
                url: '/sources',
                featureTitle: 'Sources'
            },
        ]
    },
    {
        name: 'Users',
        url: '/users',
        icon: 'bi bi-people',
        open: false,
        children: []
    },
    {
        name: 'Settings',
        url: '/settings',
        icon: 'bi bi-people',
        open: false,
        children: [
            {
                name: 'General',
                url: '/view-general-settings',
                featureTitle: 'General'
            },
        ]
    }


];