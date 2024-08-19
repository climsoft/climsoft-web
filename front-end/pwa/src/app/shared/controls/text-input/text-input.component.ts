import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent implements OnChanges {
  @Input() public includeDropDownOption: boolean = false;
  @Input() public dropDownOptionMaxHeight: number = 200;
  @Input() public includeCancelOption: boolean = false;
  @Input() public type: string = "text";
  @Input() public id!: string | number;
  @Input() public label!: string;
  @Input() public placeholder: string | null = null;
  @Input() public disabled: boolean = false;
  @Input() public readonly: boolean = false;
  @Input() public hintMessage: string = "";
  @Input() public errorMessage: string | null = "";
  @Input() public value: string | number | null = "";
  @Output() public valueChange = new EventEmitter<string>();
  @Output() public inputClick = new EventEmitter<string>();
  @Output() public inputEnterKeyPress = new EventEmitter<string>();
  @Output() public inputBlur = new EventEmitter<string>();
  @Output() public dropDownOptionClick = new EventEmitter<void>();


  // For Year-month and date control
  @Input() public max: string | number | null = null;


  //protected userChange: boolean = false;
  protected displayDropDown: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
  }

  public showDropDown(showDropDrown: boolean) {
    this.displayDropDown = showDropDrown;
  }

  protected onValueChange(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  protected onInputClick(): void {
    this.inputClick.emit(this.value ? this.value.toString() : '');
  }

  protected onEnterKeyPressed(): void {
    this.inputEnterKeyPress.emit(this.value ? this.value.toString() : '');
  }

  protected onInputBlur() {
    this.inputBlur.emit(this.value ? this.value.toString() : '');
  }

  protected onCancelOptionClick(): void {
    this.onValueChange('');
  }

  protected onDropDownButtonClick(): void {
    this.showDropDown(!this.displayDropDown);
    this.dropDownOptionClick.emit();
  }

  // Called by a directive
  protected closeDropdown(): void {
    this.showDropDown(false);
  }

}
