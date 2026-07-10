import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-import-original-lines-preview',
    templateUrl: './import-original-lines-preview.component.html',
    styleUrls: ['./import-original-lines-preview.component.scss'],
})
export class ImportOriginalLinesPreviewComponent {
    @Input() lines: string[] = [];
    @Input() loading: boolean = false;
    @Input() hasFile: boolean = false;
    @Input() noFileMessage: string = 'Upload a file to see the original text lines';
    @Input() maxHeight: string = '25vh';
}
