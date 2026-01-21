export interface RemoteFileMetadataModel {
    fileName: string;
    modifiedDate: string;
    size: number;
}

export interface ImportFileProcessingResultModel {
    remoteFileMetadata: RemoteFileMetadataModel;
    downloadedFileName?: string;
    processedFileName?: string;
    errorMessage?: string;
    unchangedFile?: boolean;
}

export interface ExportFileProcessingResultModel {
    processedFileName?: string;
    errorMessage?: string;
}

export interface ImportFileServerExecutionActivityModel {
    filePattern: string;
    specificationId: number;
    stationId?: string;
    processedFiles: ImportFileProcessingResultModel[];
}

export interface ExportFileServerExecutionActivityModel {
    filePattern?: string;
    specificationId: number;
    processedFiles: ExportFileProcessingResultModel[];
}

export type ExecutionActivityModel = ImportFileServerExecutionActivityModel | ExportFileServerExecutionActivityModel;

export interface ViewConnectorExecutionLogModel {
    id: number;
    connectorId: number;
    executionStartDatetime: string;
    executionEndDatetime: string;
    executionActivities: ExecutionActivityModel[];
    totalErrors: number;
    entryUserId: number;
    entryDateTime: string;
}
