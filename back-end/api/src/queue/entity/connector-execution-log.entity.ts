import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorSpecificationEntity } from "../../metadata/connector-specifications/entities/connector-specifications.entity";

export type ExecutionActivity = FileServerExecutionActivityVo;

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
    totalErrors: number;

    @Column({ name: "total_warnings", type: 'int' })
    totalWarnings: number;
}

// Used by File Servers
export interface FileServerExecutionActivityVo {
    filePattern: string;
    specificationId: number; // source or export specification id
    stationId?: string;

    // TODO. find a better name for this property
    files: FileMetadataVo[];
}

// TODO. Find a better name for this interface
export interface FileMetadataVo {
    remoteFileMetadata: RemoteFileMetadataVo;
    downloadedFileName?: string; // When missing. It means there is a error
    processedFileName?: string; // When missing. It means there is a error
    errorMessage?: string;
    skipped?: boolean; // When true, it means the remote file had not changed at the time the connector was being executed
}

// TODO. Find a better name for this interface
export interface RemoteFileMetadataVo {
    fileName: string;

    // Note, don't use Date type here because this will always be a JSON object.
    // There is no standard JSON representation of dates and therefore the JSON parser called by typeorm will always return this in a string format.
    // Using a Date type may result in runtime bugs due to developers calling date functions from the property when its actually a string. 
    modifiedDate: string; // ISO string format

    size: number;
}