import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorSpecificationEntity } from "../../metadata/connector-specifications/entities/connector-specifications.entity";

export type ExecutionActivity = ImportFileServerExecutionActivityVo | ExportFileServerExecutionActivityVo;

@Entity("connector_execution_log")
export class ConnectorExecutionLogEntity extends AppBaseEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
    id: number;

    //---------------------------
    @Column({ name: 'connector_id', type: 'int' })
    @Index()
    connectorId: number;
    // ManyToOne relationship with ElementTypeEntity
    @ManyToOne(() => ConnectorSpecificationEntity, { onDelete: "RESTRICT" })
    @JoinColumn({ name: 'connector_id' })
    connectorSpecification: ConnectorSpecificationEntity;
    //---------------------------

    @Column({ name: 'execution_start_date_time', type: 'timestamptz' })
    @Index()
    executionStartDatetime: Date;

    @Column({ name: 'execution_end_date_time', type: 'timestamptz' })
    @Index()
    executionEndDatetime: Date;

    @Column({ name: 'execution_activities', type: 'jsonb', nullable: true })
    executionActivities: ExecutionActivity[];

    @Column({ name: "total_errors", type: 'int' })
    @Index()
    totalErrors: number;
}

// Used by File Servers
export interface ImportFileServerExecutionActivityVo {
    filePattern: string;
    specificationId: number; // import source specification id
    stationId?: string;

    // Tracks each file through the complete processing lifecycle: download → process → import
    processedFiles: ImportFileProcessingResultVo[];
}

// Represents the complete processing result for a single file from a remote server
export interface ImportFileProcessingResultVo {
    remoteFileMetadata: RemoteFileMetadataVo;
    downloadedFileName?: string; // When missing, it means there was an error during download
    processedFileName?: string; // When missing, it means there was an error during processing
    errorMessage?: string;
    unchangedFile?: boolean; // When true, it means the remote file had not changed at the time the connector was being executed
}

// Represents metadata about a file on the remote server (FTP/SFTP/etc.)
export interface RemoteFileMetadataVo {
    fileName: string;

    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string.
    modifiedDate: string; // ISO string format

    size: number;
}

export interface ExportFileServerExecutionActivityVo {
    filePattern?: string;
    specificationId: number; // export specification id

    // Tracks each file through the complete processing lifecycle: download → process → import
    processedFiles: ExportFileProcessingResultVo[];
}

export interface ExportFileProcessingResultVo {
    processedFileName?: string; 
    errorMessage?: string;
}