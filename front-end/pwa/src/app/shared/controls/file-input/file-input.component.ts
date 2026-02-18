import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent {
  @Input() label: string = 'File';
  @Input() buttonLabel: string = 'Upload File';
  @Input() changeButtonLabel: string = 'Change File';
  @Input() accept: string = '.csv,.dat,.tsv,.txt';
  @Input() disabled: boolean = false;
  @Input() fileName: string = '';

  @Output() fileSelected = new EventEmitter<File>();

  protected onFileChange(event: any): void {
    if (event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0] as File;
    this.fileSelected.emit(file);

    // Reset file input so re-selecting same file triggers change
    event.target.value = null;
  }
}
