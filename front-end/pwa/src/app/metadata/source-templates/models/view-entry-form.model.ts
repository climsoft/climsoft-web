import { CreateEntryFormModel } from "./create-entry-form.model";
import { CreateViewElementModel } from "../../elements/models/create-view-element.model";

export interface ViewEntryFormModel extends CreateEntryFormModel {
    elementsMetadata: CreateViewElementModel[]; 
}