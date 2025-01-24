import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { UserRoleEnum } from 'src/app/admin/users/models/user-role.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-user-role-single-input',
  templateUrl: './user-role-single-input.component.html',
  styleUrls: ['./user-role-single-input.component.scss']
})
export class UserRoleSingleInputComponent {
  @Input() public label: string = 'User Role';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: UserRoleEnum[];
  @Input() public selectedId!: UserRoleEnum | null;
  @Output() public selectedIdChange = new EventEmitter<UserRoleEnum | null>();

  protected options!: UserRoleEnum[];
  protected selectedOption!: UserRoleEnum | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //console.log('period selectedId', this.selectedId, 'existing: ', this.selectedOption, '  ', changes)

    //load options once
    if (!this.options) {
      this.options = Object.values(UserRoleEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = Object.values(UserRoleEnum).filter(item => this.includeOnlyIds.includes(item));
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


  protected optionDisplayFunction(option: UserRoleEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: UserRoleEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption);
  }
}
