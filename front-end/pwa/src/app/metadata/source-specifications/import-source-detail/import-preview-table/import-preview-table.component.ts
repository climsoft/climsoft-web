import { Component, Input } from '@angular/core';
import { PreviewError, PreviewWarning } from '../../models/import-preview.model';

@Component({
    selector: 'app-import-preview-table',
    templateUrl: './import-preview-table.component.html',
    styleUrls: ['./import-preview-table.component.scss']
})
export class ImportPreviewTableComponent {
    @Input() title: string = 'Data Preview';
    @Input() columns: string[] = [];
    @Input() rows: string[][] = [];
    @Input() totalRowCount: number = 0;
    @Input() rowsDropped: number = 0;
    @Input() warnings: PreviewWarning[] = [];
    @Input() error: PreviewError | null = null;
    @Input() loading: boolean = false;
    @Input() height: string = '30vh';
    @Input() noFileMessage: string = 'Upload a sample file to see a live preview';
    @Input() hasFile: boolean = false;
}
