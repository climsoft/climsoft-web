import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent implements OnChanges {
  @Input() public includeDropDownOption: boolean = false;
  @Input() public dropDownOptionMaxHeight: string = '200px';
  @Input() public includeCancelOption: boolean = false;
  @Input() public type: string = 'text';
  @Input() public id: string | number = '';
  @Input() public label: string = '';
  @Input() public disabled: boolean = false;
  @Input() public hintMessage: string = '';
  @Input() public errorMessage: string = '';
  @Input() public value: string | number | null = '';
  @Output() public valueChange = new EventEmitter<string>();
  @Output() public inputClick = new EventEmitter<void>();
  @Output() public dropDownOptionClick = new EventEmitter<void>();

  protected userChange: boolean = false;
  protected displayDropDown: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
  }

  public showDropDown(showDropDrown: boolean) {
    this.displayDropDown = showDropDrown;
  }

  protected onInputChange(value: string): void {
    this.userChange = true;
    this.value = value;
    this.valueChange.emit(value);
  }

  protected onInputClick(): void {
    this.inputClick.emit();
  }

  protected onCancelOptionClick(): void {
    this.onInputChange('');
  }

  protected onDropDownOptionClick(): void {
    this.showDropDown(!this.displayDropDown);
    this.dropDownOptionClick.emit();
  }

  protected closeDropdown(): void {
    this.showDropDown(false);
  }

}
