export interface FileMetadataModel {
    fileName: string;
    modifiedDate: string;
    size: number;
}


export interface ImportFileProcessingResultModel {
    remoteFileMetadata: FileMetadataModel;
    downloadedFileName?: string;
    processedFileMetadata?: FileMetadataModel;
    errorMessage?: string;
    unchangedFile?: boolean;
}

export interface ExportFileProcessingResultModel {
    processedFileMetadata?: FileMetadataModel;
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
