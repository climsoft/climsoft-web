import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-user-role-single-input',
  templateUrl: './user-role-single-input.component.html',
  styleUrls: ['./user-role-single-input.component.scss']
})
export class UserRoleSingleInputComponent {
  @Input() public label: string = 'User Role';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: string[];
  @Input() public selectedId!: string | null;
  @Output() public selectedIdChange = new EventEmitter<string | null>();

  protected options!: string[];
  protected selectedOption!: string | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //console.log('period selectedId', this.selectedId, 'existing: ', this.selectedOption, '  ', changes)

    //load options once
    if (!this.options) {
     // this.options = Object.values(UserRoleEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      //this.options = Object.values(UserRoleEnum).filter(item => this.includeOnlyIds.includes(item));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }


  protected optionDisplayFunction(option: string): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: string | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption);
  }
}
