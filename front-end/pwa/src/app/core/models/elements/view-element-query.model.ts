export class ViewElementQueryModel {
    elementIds?: number[];
    typeIds?: number[];
    page?: number; // TODO. Validate to make sure it is never less than 0
    pageSize?: number;
}