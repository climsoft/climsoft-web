import { ConnectorTypeEnum } from "../enums/connector-type.enum";

export interface ConnectorJobPayloadDto {
    connectorId: number;
    connectorType: ConnectorTypeEnum;
    specificationIds: number[];
    triggeredBy: 'schedule' | 'manual';
    //userId?: number; // For manual triggers
}
