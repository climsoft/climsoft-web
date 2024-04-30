import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent {

  @Input() title!: string;
  @Input() okButtonLabel: string = 'Ok';
  @Input() cancelButtonLabel: string = 'Cancel';
  @Input() open: boolean = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() okClick = new EventEmitter();
  @Output() cancelClick = new EventEmitter();

  public openDialog() {
    this.open = true;
  }

  protected onOkClick(): void {
    this.onClose();
    this.okClick.emit();
  }

  protected onCancelClick(): void {
    this.onClose();
    this.cancelClick.emit();
  }

  private onClose(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
