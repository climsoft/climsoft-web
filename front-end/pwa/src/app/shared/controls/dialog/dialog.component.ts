import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent {

  @Input()
  title!: string;

  @Input()
  okButtonLabel: string = 'Ok';

  @Input()
  cancelButtonLabel: string = 'Cancel';

  @Input()
  deleteButtonLabel: string = 'Delete';

  @Input()
  displayOkOption: boolean = true;

  @Input()
  displayCancelOption: boolean = true;

  @Input()
  displayDeleteOption: boolean = false;

  @Input()
  closeOnOkClick: boolean = true;

  @Input()
  open: boolean = false;

  @Output()
  openChange = new EventEmitter<boolean>();

  @Output()
  okClick = new EventEmitter();

  @Output()
  cancelClick = new EventEmitter();

  @Output()
  deleteClick = new EventEmitter();

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
    this.onClose();
    this.cancelClick.emit();
  }

  protected onDeleteClick(): void {
    this.onClose();
    this.deleteClick.emit();
  }

  private onClose(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
