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
  @Input() deleteButtonLabel: string = 'Delete';
  @Input() displayOkOption: boolean = true;
  @Input() displayCancelOption: boolean = true;
  @Input() displayDeleteOption: boolean = false;
  @Input() closeOnOkClick: boolean = true;
  @Input() closeOnCancelClick: boolean = true;
  @Input() closeOnDeleteClick: boolean = true;
  @Input() open: boolean = false;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() okClick = new EventEmitter<void>();
  @Output() cancelClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();

  public openDialog() {
    this.open = true;
  }

  protected onOkClick(): void {
    if (this.closeOnOkClick) {
      this.onClose();
    }
    this.okClick.emit();
  }

  protected onCancelClick(): void {
    if (this.closeOnCancelClick) {
      this.onClose();
    }
    this.cancelClick.emit();
  }

  protected onDeleteClick(): void {
    if(this.closeOnDeleteClick) {
      this.onClose();
    }
    this.deleteClick.emit();
  }

  private onClose(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
