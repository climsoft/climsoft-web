import { DisseminationServiceEnum } from './dissemination-service.enum';
import { Wis2BoxExportParametersModel } from './wis2box-export-parameters.model';

export type DisseminationServiceParameters = Wis2BoxExportParametersModel;

export interface DisseminationExportParametersModel {
    service: DisseminationServiceEnum;
    parameters: DisseminationServiceParameters;
}
