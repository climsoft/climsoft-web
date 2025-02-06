/**
 * File for all feature menu items
 */

export type mainMenus = 'Dashboard' | 'Data Entry' | 'Metadata' | 'Admin';
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
        name: 'Data Entry',
        url: '/data-entry',
        icon: 'bi bi-file-earmark-text',
        open: false,
        children: [
            {
                name: 'Forms',
                url: '/station-form-selection',
            },
            {
                name: 'Import',
                url: '/import-selection',
            },
            {
                name: 'Manage Data',
                url: '/manage-data',
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
           
         
        ]
    },


];