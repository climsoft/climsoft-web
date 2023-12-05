import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent implements OnInit, OnChanges {

  @Input() controlLabel: string = '';
  //@Input() multiple: boolean = false;  
  @Input() disabled: boolean = false;
  @Input() hintMessage: string = '';
  @Input() errorMessage: string = '';
  @Input() value: string | null = '';
  @Output() valueChange = new EventEmitter<string>();

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onInputChange(value: string) {
    //console.log('Input Text:', value);
    this.valueChange.emit(value);
  }
}
