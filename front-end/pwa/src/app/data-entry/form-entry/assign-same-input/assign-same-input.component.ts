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
  @Input()
  public open: boolean = false;

  @Output()
  public openChange= new EventEmitter<boolean>();

  @Output()
  public ok = new EventEmitter<SameInputStruct>();

  protected input: SameInputStruct = { valueFlag: '', comment: '' };

  public openDialog(): void {
    this.open = true;
  }

  protected onOkClick(): void {
    this.open = false;
    this.ok.emit(this.input);
    this.openChange.emit(this.open);
  }

  protected onCancelClick(): void{
    this.open =false;
    this.openChange.emit(this.open);
  }
}
