import { Component } from '@angular/core';
import {
    ViewConnectorExecutionLogModel,
    ExecutionActivityModel,
    ImportFileProcessingResultModel,
    FileMetadataModel,
} from '../../models/connector-execution-log.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
    selector: 'app-execution-detail-dialog',
    templateUrl: './execution-detail-dialog.component.html',
    styleUrls: ['./execution-detail-dialog.component.scss']
})
export class ExecutionDetailDialogComponent {
    protected open: boolean = false;
    protected log!: ViewConnectorExecutionLogModel;
    protected connectorName: string = '';
    protected activeTab: 'summary' | 'activities' | 'files' = 'summary';
    protected expandedActivityIndex: number | null = null;

    constructor(private cachedMetadata: CachedMetadataService) { }

    public openDialog(log: ViewConnectorExecutionLogModel, connectorName: string): void {
        this.log = log;
        this.connectorName = connectorName;
        this.activeTab = 'summary';
        this.expandedActivityIndex = null;
        this.open = true;
    }

    protected formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.cachedMetadata.utcOffSet);
    }

    protected getDuration(): string {
        const start = new Date(this.log.executionStartDatetime).getTime();
        const end = new Date(this.log.executionEndDatetime).getTime();
        const durationMs = end - start;

        if (durationMs < 1000) {
            return `${durationMs}ms`;
        } else if (durationMs < 60000) {
            return `${(durationMs / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }

    protected getTotalFileCount(): number {
        return this.log.executionActivities.reduce((count, activity) => {
            return count + (activity.processedFiles?.length || 0);
        }, 0);
    }

    protected getSuccessfulFileCount(): number {
        if (!this.log.executionActivities) {
            return 0;
        }
        return this.log.executionActivities.reduce((count, activity) => {
            return count + (activity.processedFiles?.filter(f => !this.hasFileError(f)).length || 0);
        }, 0);
    }

    protected toggleActivity(index: number): void {
        this.expandedActivityIndex = this.expandedActivityIndex === index ? null : index;
    }


    protected getActivityFilePattern(activity: ExecutionActivityModel): string {
        return activity.filePattern || '-';
    }

    protected getActivitySpecId(activity: ExecutionActivityModel): number {
        return activity.specificationId;
    }

    protected getActivityStationId(activity: ExecutionActivityModel): string | undefined {
        return (activity as any).stationId;
    }

    protected getActivityFileCount(activity: ExecutionActivityModel): number {
        return activity.processedFiles?.length || 0;
    }

    protected getActivityErrorCount(activity: ExecutionActivityModel): number {
        if (!activity.processedFiles) {
            return 0;
        }
        return activity.processedFiles.filter(f => this.hasFileError(f)).length;
    }

    protected hasFileError(file: ImportFileProcessingResultModel | FileMetadataModel): boolean {
        if ('errorMessage' in file) {
            return !!file.errorMessage;
        }
        return false;
    }

    protected getFileErrorMessage(file: ImportFileProcessingResultModel | FileMetadataModel): string | undefined {
        if ('errorMessage' in file) {
            return file.errorMessage;
        }
        return undefined;
    }

    protected isUnchangedFile(file: ImportFileProcessingResultModel | FileMetadataModel): boolean {
        if ('unchangedFile' in file) {
            return !!file.unchangedFile;
        }
        return false;
    }

    protected getFileName(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        // Check for import file metadata
        if ('remoteFileMetadata' in file && file.remoteFileMetadata) {
            return file.remoteFileMetadata.fileName;
        }
        // Export file metadata (FileMetadataModel has fileName directly)
        if ('fileName' in file) {
            return file.fileName;
        }
        return 'Unknown';
    }

    protected getFileSize(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        // Check for import file metadata
        if ('remoteFileMetadata' in file && file.remoteFileMetadata) {
            return this.formatFileSize(file.remoteFileMetadata.size);
        }
        // Export file metadata (FileMetadataModel has size directly)
        if ('size' in file && typeof file.size === 'number') {
            return this.formatFileSize(file.size);
        }
        return '-';
    }

    protected getFileModifiedDate(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        // Check for import file metadata
        if ('remoteFileMetadata' in file && file.remoteFileMetadata) {
            return this.formatDate(file.remoteFileMetadata.modifiedDate);
        }
        // Export file metadata (FileMetadataModel has modifiedDate directly)
        if ('modifiedDate' in file) {
            return this.formatDate(file.modifiedDate);
        }
        return '-';
    }

    protected getFileStatus(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        if (this.hasFileError(file)) {
            return 'Error';
        }
        if (this.isUnchangedFile(file)) {
            return 'Skipped (Unchanged)';
        }
        // Check for import file
        if ('remoteFileMetadata' in file) {
            if ('processedFileMetadata' in file && file.processedFileMetadata) {
                return 'Processed';
            }
            if ('downloadedFileName' in file && file.downloadedFileName) {
                return 'Downloaded';
            }
            return 'Pending';
        }
        // Export file (FileMetadataModel) - if it exists in the list, it was exported
        return 'Exported';
    }

    protected getFileStatusClass(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        if (this.hasFileError(file)) {
            return 'bg-danger';
        }
        if (this.isUnchangedFile(file)) {
            return 'bg-secondary';
        }
        // Check for import file
        if ('remoteFileMetadata' in file) {
            if ('processedFileMetadata' in file && file.processedFileMetadata) {
                return 'bg-success';
            }
            if ('downloadedFileName' in file && file.downloadedFileName) {
                return 'bg-info';
            }
            return 'bg-warning text-dark';
        }
        // Export file (FileMetadataModel) - successfully exported
        return 'bg-success';
    }

    // Get processed file size for comparison
    protected getProcessedFileSize(file: ImportFileProcessingResultModel | FileMetadataModel): string {
        if ('processedFileMetadata' in file && file.processedFileMetadata) {
            return this.formatFileSize(file.processedFileMetadata.size);
        }
        // For export files, the size is directly on the FileMetadataModel
        if ('size' in file && typeof file.size === 'number') {
            return this.formatFileSize(file.size);
        }
        return '-';
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}
