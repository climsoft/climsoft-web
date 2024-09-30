import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-selector-single-input',
  templateUrl: './selector-single-input.component.html',
  styleUrls: ['./selector-single-input.component.scss']
})
export class SelectorSingleInputComponent<T> implements OnChanges {
  @Input() 
  public id!: string|number;
  
  @Input() 
  public label!: string;
  
  @Input() 
  public placeholder!: string ;

  @Input()
  public includeCancelOption: boolean = true;
  
  @Input() 
  public errorMessage: string = '';
  
  @Input() 
  public options: T[] = [];
  
  @Input() 
  public optionDisplayFn: (option: T) => string = (option => String(option));
  
  @Input() 
  public selectedOption!: T | null;
  
  @Output() 
  public selectedOptionChange = new EventEmitter<T | null>();

  protected filteredValues!: T[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filteredValues = this.options;

    //console.log('single input ngOnChanges', changes)
  }

  protected get selectedOptionDisplay(): string {
    return this.selectedOption ? this.optionDisplayFn(this.selectedOption) : '';
  }

  protected onInputChange(inputValue: string): void {
    //console.log("inputvalue", inputValue)
    if (!inputValue) {
      this.filteredValues = this.options;
      //this.selectedOption = null; //TODO. Is this needed?
      this.selectedOptionChange.emit(null);
    } else {
      this.filteredValues = this.options.filter(option =>
        this.optionDisplayFn(option).toLowerCase().includes(inputValue.toLowerCase())
      );
    }
  }

  protected onSelectedOption(option: T): void {

    //this.selectedOption = option; // TODO. Is this needed?
    this.selectedOptionChange.emit(option);
    this.filteredValues = this.options;
  }

}
