import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent {
  @ViewChild('appHtmlInput', { read: ElementRef }) inputElRef!: ElementRef;

  @Input() public displayDropDownOption: boolean = false;
  @Input() public dropDownOptionMaxHeight: number = 200;
  @Output() public displayDropDownOptionClick = new EventEmitter<void>();
  @Output() public dropDownDisplayed = new EventEmitter();
  /**
   * Fired when the drop down goes from open to closed, so a host can tear down
   * whatever it only builds while the drop down is open. The counterpart to
   * `dropDownDisplayed`; both fire on a real transition only.
   */
  @Output() public dropDownClosed = new EventEmitter<void>();

  @Input() public displayExtraInfoOption: boolean = false;
  @Output() public displayExtraInfoOptionClick = new EventEmitter<void>();

  @Input() public displaySearchOption: boolean = false;
  @Output() public displaySearchOptionClick = new EventEmitter<void>();

  @Input() public displaySettingOption: boolean = false;
  @Output() public displaySettingOptionClick = new EventEmitter<void>();

  @Input() public displayCancelOption: boolean = false;
  @Output() public displayCancelOptionClick = new EventEmitter<void>();

  @Input() public type: string = 'text';
  @Input() public id: string | number = '';;
  @Input() public label: string = '';
  @Input() public labelSuperScript: string = '';
  @Input() public displaylabelFullColon: boolean = true;
  @Input() public inputTitle: string = '';
  @Input() public labelTitle: string = '';
  @Input() public placeholder: string = '';
  @Input() public borderSize: number = 1;
  @Input() public disabled: boolean = false;
  @Input() public readonly: boolean = false;
  @Input() public showChanges: boolean = false;
  @Input() public hintMessage: string = '';
  @Input() public errorMessage: string = '';
  @Input() public warningMessage: string = '';
  @Input() public value: string | number | null | undefined = '';
  @Input() public simulateTabOnEnter: boolean = true;
  /**
   * Off by default because most inputs here are data-entry fields, where browser
   * suggestions get in the way. A login form should pass `username` /
   * `current-password` so password managers can fill it.
   */
  @Input() public autocomplete: string = 'off';

  @Output() public valueChange = new EventEmitter<string>();
  @Output() public inputClick = new EventEmitter<string>();
  @Output() public inputEnterKeyPress = new EventEmitter<string>();
  @Output() public inputBlur = new EventEmitter<string>();

  // For Year-month, date and number controls control
  @Input() public max!: string | number;
  @Input() public min!: string | number;

  protected displayDropDown: boolean = false;
  protected passwordVisible: boolean = false;

  /** The type actually rendered: a password input shows as text while toggled visible. */
  protected get inputType(): string {
    return this.type === 'password' && this.passwordVisible ? 'text' : this.type;
  }

  public focus(): void {
    this.inputElRef.nativeElement.focus();
  }

  public showDropDown(displayDropDown: boolean) {
    // Only a real transition is announced. This is public and reached from
    // several places — the input click, the chevron, an option pick, and an
    // outside click relayed by `app-drop-down-container` — so a caller asking
    // for the state it is already in must not wake the host. The container
    // filters its own document-level clicks down to real transitions too; this
    // check is what holds regardless of which caller it is.
    //
    // The outside-click close must come through this method rather than assign the field
    // directly: hosts such as the selectors build their option list only while
    // open, and `dropDownClosed` is their only signal to release it.
    if (this.displayDropDown === displayDropDown) {
      return; // If the state is already what the caller wants, don't re-emit.
    }
    this.displayDropDown = displayDropDown;
    if (displayDropDown) {
      this.dropDownDisplayed.emit();
    } else {
      this.dropDownClosed.emit();
    }
  }

  protected onValueChange(value: string): void {
    this.value = value;
    this.valueChange.emit(this.value);
  }

  protected onInputClick(): void {
    if (this.displayDropDownOption) {
      this.showDropDown(!this.displayDropDown);
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

  protected onDisplayExtraInfoClick(): void {
    this.displayExtraInfoOptionClick.emit();
  }

  protected onDisplaySearchClick(): void {
    this.displaySearchOptionClick.emit();
  }

  protected onPasswordVisibilityClick(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  protected onDisplaySettingClick(): void {
    this.displaySettingOptionClick.emit();
  }

}
