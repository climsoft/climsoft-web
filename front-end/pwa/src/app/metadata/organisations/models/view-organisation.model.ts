import { CreateUpdateOrganisationModel } from "./create-update-organisation.model";

export interface ViewOrganisationModel extends CreateUpdateOrganisationModel {
    id: number;
}