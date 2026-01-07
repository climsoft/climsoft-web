
import { ConnectorTypeEnum } from "./connector-type.enum";
import { ConnectorParameters, EndPointTypeEnum } from "./create-connector-specification.model";

export interface ViewConnectorSpecificationModel {
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
