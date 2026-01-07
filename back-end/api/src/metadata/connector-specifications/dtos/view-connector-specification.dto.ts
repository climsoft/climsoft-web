
import { ConnectorParameters, ConnectorTypeEnum, EndPointTypeEnum } from "./create-connector-specification.dto";

export class ViewConnectorSpecificationDto {
    id: number;
    name: string;
    description: string | null;
    connectorType: ConnectorTypeEnum; 
    endPointType: EndPointTypeEnum;
    hostName: string;
    timeout: number;
    maximumRetries: number;
    cronSchedule: string;
    parameters: ConnectorParameters;
    disabled: boolean;
    comment: string | null;
}
