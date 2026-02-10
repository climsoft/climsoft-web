import { Component } from '@angular/core';
import {
    ViewConnectorExecutionLogModel,
    ExecutionActivityModel,
    ImportFileServerExecutionActivityModel,
    ExportFileServerExecutionActivityModel,
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

    constructor(protected cachedMetadata: CachedMetadataService) { }

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
            if (this.isImportActivity(activity)) {
                // For imports, count files without errors
                return count + (activity.processedFiles?.filter(f => !f.errorMessage).length || 0);
            } else {
                // For exports, all files in the list are successful (errors are at activity level)
                return count + (activity.processedFiles?.length || 0);
            }
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
        if (this.isImportActivity(activity)) {
            return activity.stationId;
        }
        return undefined;
    }

    protected getActivityFileCount(activity: ExecutionActivityModel): number {
        return activity.processedFiles?.length || 0;
    }

    protected getActivityErrorCount(activity: ExecutionActivityModel): number {
        if (this.isImportActivity(activity)) {
            // For imports, count files with errors
            if (!activity.processedFiles) {
                return 0;
            }
            return activity.processedFiles.filter(f => !!f.errorMessage).length;
        } else {
            // For exports, error is at activity level
            return activity.errorMessage ? 1 : 0;
        }
    }

    protected isImportActivity(activity: ExecutionActivityModel): activity is ImportFileServerExecutionActivityModel {
        // ImportFileServerExecutionActivityModel has stationId (optional) and processedFiles is ImportFileProcessingResultModel[]
        // ExportFileServerExecutionActivityModel has errorMessage at activity level and processedFiles is FileMetadataModel[]
        // Best discriminator: check if first file has remoteFileMetadata (import) or fileName directly (export)
        if (activity.processedFiles && activity.processedFiles.length > 0) {
            return 'remoteFileMetadata' in activity.processedFiles[0];
        }
        // If no files, check for stationId which is import-specific
        return 'stationId' in activity;
    }

    protected asImportActivity(activity: ExecutionActivityModel): ImportFileServerExecutionActivityModel {
        return activity as ImportFileServerExecutionActivityModel;
    }

    protected asExportActivity(activity: ExecutionActivityModel): ExportFileServerExecutionActivityModel {
        return activity as ExportFileServerExecutionActivityModel;
    }
}
