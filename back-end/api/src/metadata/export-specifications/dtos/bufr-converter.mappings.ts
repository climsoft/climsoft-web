import { BufrTypeEnum } from "./bufr-export-parameters.dto";

// Hardcoded specifications for BUFR converter
export class BufrConverterSpecification {
    id: number;
    elementName: string;
    elementDescription: string;
    columnName: string;
    bufrType: BufrTypeEnum;
}

export const BUFR_CONVERTER_SPECIFICATIONS: BufrConverterSpecification[] = [
    //-----------------------------------------------------------
    // SYNOP elements
    //-----------------------------------------------------------
    {
        id: 1,
        elementName: 'Air Temperature',
        elementDescription: 'Air Temperature at 2 meters',
        columnName: 'air_temperature_2m',
        bufrType: BufrTypeEnum.SYNOP,
    },

    {
        id: 2,
        elementName: 'Pressure',
        elementDescription: 'Pressure at Mean Sea Level',
        columnName: 'pressure_msl',
        bufrType: BufrTypeEnum.SYNOP,
    },


    {
        id: 3,
        elementName: 'Relative Humidity',
        elementDescription: 'Relative Humidity at 2 meters',
        columnName: 'relative_humidity_2m',
        bufrType: BufrTypeEnum.SYNOP,
    },
    //-----------------------------------------------------------

    //-----------------------------------------------------------
    // DAYCLI elements
    //-----------------------------------------------------------
    {
        id: 101,
        elementName: 'Precipitation',
        elementDescription: 'TODO',
        columnName: 'precipitation',
        bufrType: BufrTypeEnum.DAYCLI,
    },
    {
        id: 102,
        elementName: 'Fresh snow depth',
        elementDescription: 'TODO',
        columnName: 'fresh_snow_depth',
        bufrType: BufrTypeEnum.DAYCLI,
    },
    {
        id: 103,
        elementName: 'Total snow depth',
        elementDescription: 'TODO',
        columnName: 'total_snow_depth',
        bufrType: BufrTypeEnum.DAYCLI,
    },
    {
        id: 104,
        elementName: 'Maximum temperature',
        elementDescription: 'TODO',
        columnName: 'maximum_temperature',
        bufrType: BufrTypeEnum.DAYCLI,
    },
    {
        id: 105,
        elementName: 'Minimum temperature',
        elementDescription: 'TODO',
        columnName: 'minimum_temperature',
        bufrType: BufrTypeEnum.DAYCLI,
    },
    {
        id: 105,
        elementName: 'Average temperature',
        elementDescription: 'TODO',
        columnName: 'average_temperature',
        bufrType: BufrTypeEnum.DAYCLI,
    }, 
    //-----------------------------------------------------------

    //-----------------------------------------------------------
    // CLIMAT elements
    //-----------------------------------------------------------
 {
        id: 201,
        elementName: 'Temp temperature',
        elementDescription: 'TODO',
        columnName: 'temp_temperature',
        bufrType: BufrTypeEnum.CLIMAT,
    },
    //-----------------------------------------------------------

    //-----------------------------------------------------------
    // TEMP elements
    //-----------------------------------------------------------
     {
        id: 301,
        elementName: 'Pressue',
        elementDescription: 'TODO',
        columnName: 'pressure',
        bufrType: BufrTypeEnum.TEMP,
    },
     //-----------------------------------------------------------


];

