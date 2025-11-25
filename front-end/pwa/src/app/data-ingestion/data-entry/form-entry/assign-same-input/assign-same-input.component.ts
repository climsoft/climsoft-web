import { Component, Output, EventEmitter } from '@angular/core';

export interface SameInputStruct {
  valueFlag: string;
  comment: string;
}

@Component({
  selector: 'app-assign-same-input',
  templateUrl: './assign-same-input.component.html',
  styleUrls: ['./assign-same-input.component.scss']
})
export class AssignSameInputComponent {

  @Output() public ok = new EventEmitter<SameInputStruct>();

  protected open: boolean = false;
  protected input: SameInputStruct = { valueFlag: '', comment: '' };

  public showDialog(): void {
    this.open = true;
  }

  protected onOkClick(): void {
    this.open = false;
    this.ok.emit(this.input); 
  }

  protected onCancelClick(): void {
    this.open = false; 
  }
}
