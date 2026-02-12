import { Component, Input } from '@angular/core';
import { FileMetadataModel } from '../../models/connector-execution-log.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
    selector: 'app-export-files-table',
    templateUrl: './export-files-table.component.html',
    styleUrls: ['./export-files-table.component.scss']
})
export class ExportFilesTableComponent {
    @Input() files: FileMetadataModel[] = [];
    @Input() activityErrorMessage?: string;
    @Input() utcOffset: number = 0;

    protected getFileName(file: FileMetadataModel): string {
        return file.fileName;
    }

    protected getFileSize(file: FileMetadataModel): string {
        return this.formatFileSize(file.size);
    }

    protected getFileModifiedDate(file: FileMetadataModel): string {
        return this.formatDate(file.modifiedDate);
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private formatDate(dateString: string | null): string {
        if (!dateString) {
            return '-';
        }
        return DateUtils.getPresentableDatetime(dateString, this.utcOffset);
    }
}
