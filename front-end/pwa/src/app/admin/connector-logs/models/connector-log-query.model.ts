export interface ConnectorLogQueryModel {
    connectorId?: number;
    startDate?: string;
    endDate?: string;
    hasErrors?: boolean;
    page?: number;
    pageSize?: number;
}
