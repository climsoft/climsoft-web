
import { ConnectorParameters, ConnectorTypeEnum } from "./create-connector-specification.dto";

export interface ConnectorJobPayloadDto {
    connectorId: number;
    connectorType: ConnectorTypeEnum;
    extraMetadata: ConnectorParameters;
    triggeredBy: 'schedule' | 'manual';
    maxRetries: number;
}
