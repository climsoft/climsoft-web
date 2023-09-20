import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';


@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrls: ['./number-input.component.scss']
})
export class NumberInputComponent implements OnInit, OnChanges  {

  @Input() controlLabel: string = "";  
  @Input() disabled: boolean = false;
  @Input() hintMessage: string = '';
  @Input() errorMessage: string = '';
  @Input() value!: number;
  @Output() valueChange = new EventEmitter<number >();


  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onInputChange(value: string) {
    console.log('Number Text:', value);
    this.valueChange.emit(+value);
  }

}
