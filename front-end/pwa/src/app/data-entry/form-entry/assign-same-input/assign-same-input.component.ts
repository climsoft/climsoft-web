import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

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

  @Output() ok = new EventEmitter<SameInputStruct>();
  public open: boolean = false;

  protected input: SameInputStruct = { valueFlag: '', comment: '' };

  protected onOkClick(): void {
    this.ok.emit(this.input);
  }
}
