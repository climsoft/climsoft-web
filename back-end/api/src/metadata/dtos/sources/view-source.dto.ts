
import { CreateUpdateSourceDto } from "./create-update-source.dto";

export class ViewSourceDto<T extends object> extends CreateUpdateSourceDto<T> {
    id: number; 
    sourceTypeName: string;
}