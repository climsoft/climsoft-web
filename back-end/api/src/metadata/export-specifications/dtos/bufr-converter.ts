// Hardcoded specifications for BUFR converter
export class BufrConverterSpecification {
    id: number;
    elementName: string;
    elementDescription: string;
    ecTemplateDataIndex: number;
    columnName: string;
}

export const BUFR_CONVERTER_SPECIFICATIONS: BufrConverterSpecification[] = [
    {
        id: 1,
        elementName: 'Air Temperature',
        elementDescription: 'Air Temperature at 2 meters',
        ecTemplateDataIndex: 11,
        columnName: 'air_temperature_2m'
    },

    {
        id: 2,
        elementName: 'Pressure',
        elementDescription: 'Pressure at Mean Sea Level',
        ecTemplateDataIndex: 12,
        columnName: 'pressure_msl'
    },


    {
        id: 3,
        elementName: 'Relative Humidity',
        elementDescription: 'Relative Humidity at 2 meters',
        ecTemplateDataIndex: 13,
        columnName: 'relative_humidity_2m'
    }
];