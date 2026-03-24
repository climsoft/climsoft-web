import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  @Input() public title: string = 'Confirm';
  @Input() public okButtonLabel: string = 'Yes';
  @Input() public cancelButtonLabel: string = 'No';
  @Input() public displayCannotBeUndone: boolean = false;

  @Output() public okConfirmed = new EventEmitter<void>();
  @Output() public cancelConfirmed = new EventEmitter<void>();

  protected open: boolean = false;

  public openDialog(): void {
    this.open = true;
  }

  protected onOkConfirm(): void {
    this.open = false;
    this.okConfirmed.emit();
  }

  protected onCancelConfirm(): void {
    this.open = false;
    this.cancelConfirmed.emit();
  }
}
