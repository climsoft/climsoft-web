import { Component, Input } from '@angular/core';
import { PreviewError } from '../../../metadata/source-specifications/models/import-preview.model';  

@Component({
    selector: 'app-import-preview-table',
    templateUrl: './import-preview-table.component.html',
    styleUrls: ['./import-preview-table.component.scss']
})
export class ImportPreviewTableComponent {
    @Input() title: string = '';
    @Input() columns: string[] = [];
    @Input() rows: string[][] = [];
    @Input() totalRowCount: number = 0;
    @Input() warnings: any[] = []; // TODO.
    @Input() error: PreviewError | null | undefined ; // Todo remove null
    @Input() loading: boolean = false;
    @Input() maxHeight: string = '30vh';
    @Input() noFileMessage: string = 'Upload a sample file to see a live preview';
    @Input() hasFile: boolean = false;
}
