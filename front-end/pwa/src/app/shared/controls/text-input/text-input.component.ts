import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent implements OnChanges {
  @Input() public displayDropDownOption: boolean = false;
  @Input() public dropDownOptionMaxHeight: number = 200;
  @Output() public displayDropDownOptionClick = new EventEmitter<void>();
 

  @Input() public displayExtraInfoOption: boolean = false;
  @Output() public displayExtraInfoOptionClick = new EventEmitter<void>();

  @Input() public displaySearchOption: boolean = false;
  @Output() public displaySearchOptionClick = new EventEmitter<void>();

  @Input() public displayCancelOption: boolean = false;
  @Output() public displayCancelOptionClick = new EventEmitter<void>();

  @Input() public type: string = "text";
  @Input() public id!: string | number;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public disabled: boolean = false;
  @Input() public readonly: boolean = false;
  @Input() public showChanges: boolean = false;
  @Input() public hintMessage: string | null | undefined; // TODO. Null not needed
  @Input() public errorMessage: string | null | undefined; // TODO. Null not needed
  @Input() public warningMessage: string | undefined;
  @Input() public value: string | number | null = "";

  @Output() public valueChange = new EventEmitter<string>();
  @Output() public inputClick = new EventEmitter<string>();
  @Output() public inputEnterKeyPress = new EventEmitter<string>();
  @Output() public inputBlur = new EventEmitter<string>();


  // For Year-month and date control
  @Input() public max: string | number | null = null;

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
    if(this.displayDropDownOption){
      this.displayDropDown = true;
    }
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
    this.displayCancelOptionClick.emit()
  }

  protected onDropDownButtonClick(): void {
    this.showDropDown(!this.displayDropDown);
    this.displayDropDownOptionClick.emit();
  }

  // Called by a directive
  protected closeDropdown(): void {
    this.showDropDown(false);
  }

  protected onDisplayExtraInfoClick(): void{
    this.displayExtraInfoOptionClick.emit();
  }

  protected onDisplaySearchClick(): void{
    this.displaySearchOptionClick.emit();
  }

}
