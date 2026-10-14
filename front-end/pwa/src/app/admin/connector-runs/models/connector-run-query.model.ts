import { ConnectorRunStatusEnum } from './connector-run.model';

export interface ConnectorRunQueryModel {
    connectorId?: number;
    startDate?: string;
    endDate?: string;
    hasErrors?: boolean;
    status?: ConnectorRunStatusEnum;
    /** Hide runs that never reached the server. */
    discoveredOnly?: boolean;
    page?: number;
    pageSize?: number;
}
