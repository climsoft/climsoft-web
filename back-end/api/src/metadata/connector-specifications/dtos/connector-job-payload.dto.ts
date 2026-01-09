
import { ConnectorParameters, ConnectorTypeEnum } from "./create-connector-specification.dto";

export interface ConnectorJobPayloadDto {
    connectorId: number;
    connectorType: ConnectorTypeEnum;
    parameters: ConnectorParameters;
    triggeredBy: 'schedule' | 'manual';
    maximumRetries: number;
}
