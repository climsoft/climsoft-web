import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { StringUtils } from '../../utils/string.utils';


@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrls: ['./number-input.component.scss']
})
export class NumberInputComponent implements OnInit, OnChanges {

  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() hintMessage: string = '';
  @Input() errorMessage: string = '';
  @Input() value!: number | null;
  @Output() valueChange = new EventEmitter<number | null>();

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onInputChange(value: string) {
    if (StringUtils.containsNumbersOnly(value)) {
      this.value = +value;
    } else {
      this.value = null
    }
    this.valueChange.emit(this.value);
  }

}
