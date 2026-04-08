import { Component, EventEmitter, Input, Output } from '@angular/core';

export type DialogButtonColor = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';

export interface DialogButtonOptions {
  label: string;
  closeDialogOnClick?: boolean;
  disable?: boolean;
  color?: DialogButtonColor;
}

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent {
  @Input() title: string = '';
  @Input() open: boolean = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() firstButtonOptions: DialogButtonOptions | undefined;
  @Input() secondButtonOptions: DialogButtonOptions | undefined;
  @Input() thirdButtonOptions: DialogButtonOptions | undefined;
  @Input() fourthButtonOptions: DialogButtonOptions | undefined;

  @Output() firstButtonClick = new EventEmitter<void>();
  @Output() secondButtonClick = new EventEmitter<void>();
  @Output() thirdButtonClick = new EventEmitter<void>();
  @Output() fourthButtonClick = new EventEmitter<void>();

  public openDialog() {
    this.open = true;
  }

  protected onCloseClick(): void {
    this.onClose();
  }

  protected onFirstButtonClick(): void {
    if (this.firstButtonOptions?.closeDialogOnClick) {
      this.onClose();
    }
    this.firstButtonClick.emit();
  }

  protected onSecondButtonClick(): void {
    if (this.secondButtonOptions?.closeDialogOnClick) {
      this.onClose();
    }
    this.secondButtonClick.emit();
  }

  protected onThirdButtonClick(): void {
    if (this.thirdButtonOptions?.closeDialogOnClick) {
      this.onClose();
    }
    this.thirdButtonClick.emit();
  }

  protected onFourthButtonClick(): void {
    if (this.fourthButtonOptions?.closeDialogOnClick) {
      this.onClose();
    }
    this.fourthButtonClick.emit();
  }

  protected btnClass(options: DialogButtonOptions): string {
    return `btn btn-sm btn-outline-${options.color ?? 'secondary'}`;
  }

  private onClose(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }

}
