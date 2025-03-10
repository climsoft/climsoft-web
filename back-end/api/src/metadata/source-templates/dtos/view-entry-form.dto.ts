
import { CreateViewElementDto } from "src/metadata/elements/dtos/elements/create-view-element.dto";
import { CreateEntryFormDTO } from "./create-entry-form.dto";

export class ViewEntryFormDTO extends CreateEntryFormDTO {
    elementsMetadata: CreateViewElementDto[];
}