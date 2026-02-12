import { Component, Input } from '@angular/core';
import { ImportFileProcessingResultModel } from '../../models/connector-execution-log.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
    selector: 'app-import-files-table',
    templateUrl: './import-files-table.component.html',
    styleUrls: ['./import-files-table.component.scss']
})
export class ImportFilesTableComponent {
    @Input() files: ImportFileProcessingResultModel[] = [];
    @Input() utcOffset: number = 0;

    protected getFileName(file: ImportFileProcessingResultModel): string {
        return file.remoteFileMetadata.fileName;
    }

    protected getFileSize(file: ImportFileProcessingResultModel): string {
        return this.formatFileSize(file.remoteFileMetadata.size);
    }

    protected getFileModifiedDate(file: ImportFileProcessingResultModel): string {
        return this.formatDate(file.remoteFileMetadata.modifiedDate);
    }

    protected getFileStatus(file: ImportFileProcessingResultModel): string {
        if (this.hasFileError(file)) {
            return 'Error';
        }
        if (this.isUnchangedFile(file)) {
            return 'Skipped (Unchanged)';
        }
        if (file.processedFileMetadata) {
            return 'Processed';
        }
        if (file.downloadedFileName) {
            return 'Downloaded';
        }
        return 'Pending';
    }

    protected getFileStatusClass(file: ImportFileProcessingResultModel): string {
        if (this.hasFileError(file)) {
            return 'bg-danger';
        }
        if (this.isUnchangedFile(file)) {
            return 'bg-secondary';
        }
        if (file.processedFileMetadata) {
            return 'bg-success';
        }
        if (file.downloadedFileName) {
            return 'bg-info';
        }
        return 'bg-warning text-dark';
    }

    protected hasFileError(file: ImportFileProcessingResultModel): boolean {
        return !!file.errorMessage;
    }

    protected isUnchangedFile(file: ImportFileProcessingResultModel): boolean {
        return !!file.unchangedFile;
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
