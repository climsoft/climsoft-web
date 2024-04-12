
export interface UpdateElementModel {
    name: string;
    abbreviation: string;
    description: string;
    units: string;
    typeId: number;
    lowerLimit: number | null;
    upperLimit: number | null;
    entryScaleFactor: number | null;
    comment: string | null;
}