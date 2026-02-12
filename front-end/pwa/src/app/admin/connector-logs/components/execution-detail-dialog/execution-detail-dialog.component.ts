import { Component } from '@angular/core';
import {
    ViewConnectorExecutionLogModel,
    ExecutionActivityModel,
    ImportFileServerExecutionActivityModel,
    ExportFileServerExecutionActivityModel,
} from '../../models/connector-execution-log.model';
import { ConnectorTypeEnum } from 'src/app/metadata/connector-specifications/models/create-connector-specification.model';
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
    protected connectorType!: ConnectorTypeEnum;
    protected activeTab: 'summary' | 'activities' | 'files' = 'summary';
    protected expandedActivityIndex: number | null = null;

    constructor(protected cachedMetadata: CachedMetadataService) { }

    public openDialog(log: ViewConnectorExecutionLogModel, connectorName: string, connectorType: ConnectorTypeEnum): void {
        this.log = log;
        this.connectorName = connectorName;
        this.connectorType = connectorType;
        this.activeTab = 'summary';
        this.expandedActivityIndex = null;
        this.open = true;
    }

    protected isImportConnector(): boolean {
        return this.connectorType === ConnectorTypeEnum.IMPORT;
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
            if (this.isImportConnector()) {
                // For imports, count files without errors
                const importActivity = activity as ImportFileServerExecutionActivityModel;
                return count + (importActivity.processedFiles?.filter(f => !f.errorMessage).length || 0);
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
        if (this.isImportConnector()) {
            return (activity as ImportFileServerExecutionActivityModel).stationId;
        }
        return undefined;
    }

    protected getActivityFileCount(activity: ExecutionActivityModel): number {
        return activity.processedFiles?.length || 0;
    }

    protected getActivityErrorCount(activity: ExecutionActivityModel): number {
        if (this.isImportConnector()) {
            // For imports, count files with errors
            const importActivity = activity as ImportFileServerExecutionActivityModel;
            if (!importActivity.processedFiles) {
                return 0;
            }
            return importActivity.processedFiles.filter(f => !!f.errorMessage).length;
        } else {
            // For exports, error is at activity level
            const exportActivity = activity as ExportFileServerExecutionActivityModel;
            return exportActivity.errorMessage ? 1 : 0;
        }
    }

    protected asImportActivity(activity: ExecutionActivityModel): ImportFileServerExecutionActivityModel {
        return activity as ImportFileServerExecutionActivityModel;
    }

    protected asExportActivity(activity: ExecutionActivityModel): ExportFileServerExecutionActivityModel {
        return activity as ExportFileServerExecutionActivityModel;
    }
}
