import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrls: ['./input-dialog.component.scss']
})
export class InputDialogComponent {
  @Input() title: string = '';
  @Input() inputLabel: string = '';
  @Output() ok = new EventEmitter<string>();
  open: boolean = false;
  value: string = '';

  openDialog(value?: string) {
    this.open = true;
    this.value = value ?? '';
  }

  onOkClick(): void {
    this.ok.emit(this.value);
  }

}
