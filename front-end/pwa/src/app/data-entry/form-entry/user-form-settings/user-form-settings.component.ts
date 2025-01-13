import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LocalStorageService } from 'src/app/shared/services/local-storage.service';

export interface UserFormSettingStruct {
  incrementDateSelector: boolean;
  fieldsBorderSize: number;

  linearLayoutSettings: {
    maxRows: number;
  }

  gridLayoutSettings: {
    gridHeight: number;
    gridNavigation: 'horizontal' | 'vertical';
  }
}

export const USER_FORM_SETTING_STORAGE_NAME: string = 'user_form_setting_v1'

export const DEFAULT_USER_FORM_SETTINGS: UserFormSettingStruct = {
  incrementDateSelector: false,
  fieldsBorderSize: 1,
  linearLayoutSettings: {
    maxRows: 5
  },
  gridLayoutSettings: {
    gridHeight: 60,
    gridNavigation: 'horizontal',
  }
}

@Component({
  selector: 'app-user-form-settings',
  templateUrl: './user-form-settings.component.html',
  styleUrls: ['./user-form-settings.component.scss']
})
export class UserFormSettingsComponent {
  @Input()
  public open: boolean = false;

  @Output()
  public openChange = new EventEmitter<boolean>();

  @Output()
  public ok = new EventEmitter<UserFormSettingStruct>();

  protected activeTab: 'linear' | 'grid' = 'linear';

  protected userFormSettings!: UserFormSettingStruct;


  constructor(private localStorage: LocalStorageService) {
    const savedUserFormSetting = this.localStorage.getItem<UserFormSettingStruct>(USER_FORM_SETTING_STORAGE_NAME);
    this.userFormSettings = savedUserFormSetting ? savedUserFormSetting : {...DEFAULT_USER_FORM_SETTINGS}; //pass by value. Important
  }

  public openDialog(): void {
    this.open = true;
  }

  protected onTabChange(selectedTab: 'linear' | 'grid'): void {
    this.activeTab = selectedTab;
  }

  protected get gridNavigation(): string {
    return this.userFormSettings.gridLayoutSettings.gridNavigation === 'vertical' ? 'Vertically' : 'Horizontally';
  }

  protected onGridEntryNavigationSelection(option: string): void {
    if (option === 'Vertically') {
      this.userFormSettings.gridLayoutSettings.gridNavigation = 'vertical';
    } else {
      this.userFormSettings.gridLayoutSettings.gridNavigation = 'horizontal';
    }
  }

  protected onOkClick(): void {
    this.localStorage.setItem(USER_FORM_SETTING_STORAGE_NAME, this.userFormSettings);
    this.open = false;
    this.ok.emit(this.userFormSettings);
    this.openChange.emit(this.open);
  }

  protected onCancelClick(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
