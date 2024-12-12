import { ElementDomainEnum } from "src/metadata/elements/dtos/elements/element-domain.enum";
import { ViewElementSubdomainDto } from "src/metadata/elements/dtos/elements/view-element-subdomain.dto"; 
import { ViewElementTypeDto } from "src/metadata/elements/dtos/elements/view-element-type.dto";
import { StationObservationEnvironmentDto } from "src/metadata/stations/dtos/view-station-obs-env.dto";
import { StationObservationFocusDto } from "src/metadata/stations/dtos/view-station-obs-focus.dto";

export class MetadataDefaults  {
   
    public static ELEMENT_SUBDOMAINS : ViewElementSubdomainDto[] = [
        { id: 1, name: 'Surface', description: '',  domain: ElementDomainEnum.ATMOSPHERE},
        { id: 2, name: 'Upper-air', description: '',  domain: ElementDomainEnum.ATMOSPHERE},
        { id: 3, name: 'Atmospheric Composition', description: '',  domain: ElementDomainEnum.ATMOSPHERE},

        { id: 4, name: 'Hydrosphere', description: '',  domain: ElementDomainEnum.LAND},
        { id: 5, name: 'Cryosphere', description: '',  domain: ElementDomainEnum.LAND},
        { id: 6, name: 'Biosphere', description: '',  domain: ElementDomainEnum.LAND},
        { id: 7, name: 'Anthroposphere', description: '',  domain: ElementDomainEnum.LAND},

        { id: 8, name: 'Physical', description: '',  domain: ElementDomainEnum.OCEAN},
        { id: 9, name: 'Biogeochemical', description: '',  domain: ElementDomainEnum.OCEAN},
        { id: 10, name: 'Biological/ecosystems', description: '',  domain: ElementDomainEnum.OCEAN}, 
    ];

    public static ELEMENT_TYPES : ViewElementTypeDto[] = [
        { id: 1, name: 'Precipitation', description: '',  subdomainId: 1}, 
        { id: 2, name: 'Pressure', description: '',  subdomainId: 1}, 
        { id: 3, name: 'Radiation budget', description: '',  subdomainId: 1}, 
        { id: 4, name: 'Temperature', description: '',  subdomainId: 1}, 
        { id: 5, name: 'Water vapour', description: '',  subdomainId: 1}, 
        { id: 6, name: 'Wind speed and direction', description: '',  subdomainId: 1}, 

        { id: 7, name: 'Earth radiation budget', description: '',  subdomainId: 2}, 
        { id: 8, name: 'Lightning', description: '',  subdomainId: 2}, 
        { id: 9, name: 'Temperature', description: '',  subdomainId: 2}, 
        { id: 10, name: 'Water vapor', description: '',  subdomainId: 2}, 
        { id: 11, name: 'Wind speed and direction', description: '',  subdomainId: 2}, 
        { id: 12, name: 'Clouds', description: '',  subdomainId: 2}, 

        { id: 13, name: 'Aerosols', description: '',  subdomainId: 3}, 
        { id: 14, name: 'Carbon dioxide, methane and other greenhouse gases', description: '',  subdomainId: 3}, 
        { id: 15, name: 'Ozone', description: '',  subdomainId: 3}, 
        { id: 16, name: 'Precursors for aerosols and ozone', description: '',  subdomainId: 3}, 

        { id: 17, name: 'Groundwater', description: '',  subdomainId: 4}, 
        { id: 18, name: 'Lakes', description: '',  subdomainId: 4}, 
        { id: 19, name: 'River discharge', description: '',  subdomainId: 4}, 
        { id: 20, name: 'Terrestrial water storage', description: '',  subdomainId: 4}, 

        { id: 21, name: 'Glaciers', description: '',  subdomainId: 5}, 
        { id: 22, name: 'Ice sheets and ice shelves', description: '',  subdomainId: 5}, 
        { id: 23, name: 'Permafrost', description: '',  subdomainId: 5}, 
        { id: 24, name: 'Snow', description: '',  subdomainId: 5}, 

        { id: 25, name: 'Above-ground biomass', description: '',  subdomainId: 6}, 
        { id: 26, name: 'Albedo', description: '',  subdomainId: 6}, 
        { id: 27, name: 'Evaporation from land', description: '',  subdomainId: 6}, 
        { id: 28, name: 'Fire', description: '',  subdomainId: 6}, 
        { id: 29, name: 'Fraction of absorbed photosynthetically active radiation (FAPAR)', description: '',  subdomainId: 6}, 
        { id: 30, name: 'Land cover', description: '',  subdomainId: 6}, 
        { id: 31, name: 'Land surface temperature', description: '',  subdomainId: 6}, 
        { id: 32, name: 'Leaf area index', description: '',  subdomainId: 6}, 
        { id: 33, name: 'Soil carbon', description: '',  subdomainId: 6}, 
        { id: 34, name: 'Soil moisture', description: '',  subdomainId: 6}, 

        { id: 35, name: 'Anthropogenic Greenhouse gas fluxes', description: '',  subdomainId: 7}, 
        { id: 36, name: 'Anthropogenic water use', description: '',  subdomainId: 7}, 

        { id: 37, name: 'Ocean surface heat flux', description: '',  subdomainId: 8}, 
        { id: 38, name: 'Sea ice', description: '',  subdomainId: 8}, 
        { id: 39, name: 'Sea level', description: '',  subdomainId: 8}, 
        { id: 40, name: 'Sea state', description: '',  subdomainId: 8}, 
        { id: 41, name: 'Sea surface currents', description: '',  subdomainId: 8}, 
        { id: 42, name: 'Sea surface salinity', description: '',  subdomainId: 8}, 
        { id: 43, name: 'Sea surface stress', description: '',  subdomainId: 8}, 
        { id: 44, name: 'Sea surface temperature', description: '',  subdomainId: 8}, 
        { id: 45, name: 'Subsurface currents', description: '',  subdomainId: 8}, 
        { id: 46, name: 'Subsurface salinity', description: '',  subdomainId: 8}, 
        { id: 47, name: 'Subsurface temperature', description: '',  subdomainId: 8}, 

        { id: 48, name: 'Inorganic carbon', description: '',  subdomainId: 9}, 
        { id: 49, name: 'Nitrous oxide', description: '',  subdomainId: 9}, 
        { id: 50, name: 'Nutrients', description: '',  subdomainId: 9}, 
        { id: 51, name: 'Ocean colour', description: '',  subdomainId: 9}, 
        { id: 52, name: 'Oxygen', description: '',  subdomainId: 9}, 
        { id: 53, name: 'Transient tracers', description: '',  subdomainId: 9}, 

        { id: 54, name: 'Marine habitats', description: '',  subdomainId: 10}, 
        { id: 55, name: 'Plankton', description: '',  subdomainId: 10}, 

    ];

    public static STATION_ENVIRONMENTS: StationObservationEnvironmentDto[] = [
        { id: 1, name: 'Air (fixed)', description: '' },
        { id: 2, name: 'Air (mobile)', description: '' },

        { id: 3, name: 'Lake/River (fixed)', description: '' },
        { id: 4, name: 'Lake/River (mobile)', description: '' },

        { id: 5, name: 'Land (fixed)', description: '' },
        { id: 6, name: 'Land (mobile)', description: '' },
        { id: 7, name: 'Land (on ice)', description: '' },

        { id: 8, name: 'Sea (fixed)', description: '' },
        { id: 9, name: 'Sea (mobile)', description: '' },
        { id: 10, name: 'Sea (on ice)', description: '' },

        { id: 11, name: 'Underwater (fixed)', description: '' },
        { id: 12, name: 'Underwater (mobile)', description: '' },
    ];

    public static STATION_FOCUS: StationObservationFocusDto[] = [
        { id: 1, name: 'Agricultural meteorological station', description: '' },
        { id: 2, name: 'Aircraft meteorological station', description: '' }, 
        { id: 3, name: 'Climatological station', description: '' },
        { id: 4, name: 'Cryosphere station', description: '' },
        { id: 5, name: 'Precipitation station', description: '' },
        { id: 6, name: 'Radiation station', description: '' },
        { id: 7, name: 'Sea profiling station', description: '' },
        { id: 8, name: 'Space weather station', description: '' },
        { id: 9, name: 'Surface land meteorological station (SYNOP)', description: '' },
        { id: 10, name: 'Surface marine meteorological station', description: '' },
        { id: 11, name: 'Upper-air/Radiosonde station', description: '' },
        { id: 12, name: 'Radar station', description: '' },
    ];
}
