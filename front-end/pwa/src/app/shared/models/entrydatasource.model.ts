export interface EntryDataSource {
    id: number;
    name: string;
    description: string;
    acquisitionTypeId: number;
    extraMetadata: string; //json
}