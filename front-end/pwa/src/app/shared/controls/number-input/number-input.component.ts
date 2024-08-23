import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';


@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrls: ['./number-input.component.scss']
})
export class NumberInputComponent implements OnInit, OnChanges {
  @Input() id!: string | number;
  @Input() label!: string;
  @Input() disabled: boolean = false;
  @Input() hintMessage!: string;
  @Input() errorMessage!: string | null;
  @Input() value!: number | null;
  @Output() valueChange = new EventEmitter<number>();
  @Output() public inputClick = new EventEmitter<number | null>();
  @Output() public inputEnterKeyPress = new EventEmitter<number>();
  @Output() public inputBlur = new EventEmitter<number>();

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  protected onValueChange(value: string) {
    if (StringUtils.containsNumbersOnly(value)) {
      this.value = +value;
      this.valueChange.emit(+value);
    } 

  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value);
  }

  protected onEnterKeyPressed(): void {
    if (this.value !== null) {
      this.inputEnterKeyPress.emit(this.value);
    }
  }

  protected onInputBlur(): void {
    if (this.value !== null) {
      this.inputBlur.emit(this.value);
    }
  }



}
