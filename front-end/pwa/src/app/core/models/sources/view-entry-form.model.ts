import { CreateEntryFormModel } from "./create-entry-form.model";
import { ViewElementModel } from "../view-element.model";

export interface ViewEntryFormModel extends CreateEntryFormModel {
    elementsMetadata: ViewElementModel[]; 
}