import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';


@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrls: ['./number-input.component.scss']
})
export class NumberInputComponent implements OnChanges {
  @Input()
  public id!: string | number;
  @Input()
  public label!: string;
  @Input()
  public disabled: boolean = false;
  @Input()
  public hintMessage!: string;
  @Input()
  public errorMessage!: string | null;
  @Input()
  public max!: number;
  @Input()
  public value!: number | null;
  @Input()
  public numValue!: number;
  @Output()
  public valueChange = new EventEmitter<number | null>();
  @Output()
  public numValueChange = new EventEmitter<number>();
  @Output()
  public inputClick = new EventEmitter<number | null>();
  @Output()
  public inputEnterKeyPress = new EventEmitter<number | null>();
  @Output()
  public inputBlur = new EventEmitter<number | null>();

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['numValue']) {
      this.value = this.numValue;
    } else if (changes['value'] && this.value !== null && StringUtils.containsNumbersOnly(this.value.toString())) {
      this.numValue = +this.value;
    }
  }

  protected onValueChange(value: string) {
    if (StringUtils.isNullOrEmpty(value)) {
      this.value = null;
    } else if (StringUtils.containsNumbersOnly(value)) {
      this.value = +value;
      this.numValue = this.value;
      this.numValueChange.emit(this.numValue);
    }
    this.valueChange.emit(this.value);
  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value);
  }

  protected onEnterKeyPressed(): void {
    this.inputEnterKeyPress.emit(this.value);
  }

  protected onInputBlur(): void {
    this.inputBlur.emit(this.value);
  }

}
