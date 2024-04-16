import { CreateUpdateSourceModel } from "./create-update-source.model";

export interface ViewSourceModel<T> extends CreateUpdateSourceModel<T>  {
    id: number;
    sourceTypeName: string;
}