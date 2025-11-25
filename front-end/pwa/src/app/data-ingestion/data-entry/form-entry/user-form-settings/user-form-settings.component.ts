import { Component, Output, EventEmitter } from '@angular/core';
import { UserFormSettingStruct } from '../form-entry.component';

@Component({
  selector: 'app-user-form-settings',
  templateUrl: './user-form-settings.component.html',
  styleUrls: ['./user-form-settings.component.scss']
})
export class UserFormSettingsComponent {
  @Output()
  public ok = new EventEmitter<UserFormSettingStruct>();

  protected activeTab: 'linear' | 'grid' = 'linear';
  protected userFormSettings!: UserFormSettingStruct;
  protected open: boolean = false;


  constructor() { }

  public showDialog(newUserFormSettings: UserFormSettingStruct) {
    // Important. Clone the form settings
    this.userFormSettings = {
      displayExtraInformationOption: newUserFormSettings.displayExtraInformationOption,
      incrementDateSelector: newUserFormSettings.incrementDateSelector,
      fieldsBorderSize: newUserFormSettings.fieldsBorderSize,

      linearLayoutSettings: {
        height: newUserFormSettings.linearLayoutSettings.height,
        maxRows: newUserFormSettings.linearLayoutSettings.maxRows
      },

      gridLayoutSettings: {
        height: newUserFormSettings.gridLayoutSettings.height,
        navigation: newUserFormSettings.gridLayoutSettings.navigation
      }
    };

    this.open = true;
  }


  protected onTabChange(selectedTab: 'linear' | 'grid'): void {
    this.activeTab = selectedTab;
  }

  protected get gridNavigation(): string {
    return this.userFormSettings.gridLayoutSettings.navigation === 'vertical' ? 'Vertically' : 'Horizontally';
  }

  protected onGridEntryNavigationSelection(option: string): void {
    if (option === 'Vertically') {
      this.userFormSettings.gridLayoutSettings.navigation = 'vertical';
    } else {
      this.userFormSettings.gridLayoutSettings.navigation = 'horizontal';
    }
  }

  protected async onOkClick(): Promise<void> {
    this.open = false;
    this.ok.emit(this.userFormSettings);
  }

  protected onCancelClick(): void {
    this.open = false;
  }
}
