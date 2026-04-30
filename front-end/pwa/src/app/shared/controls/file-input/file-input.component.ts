import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent {
  @Input() public id: string = '';
  @Input() public label: string = 'File';
  @Input() public labelSuperScript: string | undefined = '';
  @Input() public displaylabelFullColon: boolean = true;
  @Input() public buttonLabel: string = 'Upload File';
  @Input() public accept: string | undefined = undefined; // All files
  @Input() public disabled: boolean = false;
  @Input() public fileName: string = '';

  @Output() fileSelected = new EventEmitter<File>();

  protected onFileChange(event: any): void {
    if (event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0] as File;
    this.fileName = file.name;
    this.fileSelected.emit(file);

    // Reset file input so re-selecting same file triggers change
    event.target.value = null;
  }
}
