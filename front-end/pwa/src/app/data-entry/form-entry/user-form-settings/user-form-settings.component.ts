import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LocalStorageService } from 'src/app/shared/services/local-storage.service';

export interface UserFormSettingStruct {
  gridNavigation: 'horizontal' | 'vertical';
  incrementDateSelector: boolean;
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

  protected userFormSetting!: UserFormSettingStruct;

  public static USER_FORM_SETTING_STORAGE_NAME : string = 'user_form_setting;'

  constructor(private localStorage: LocalStorageService) {
    const savedUserFormSetting = this.localStorage.getItem<UserFormSettingStruct>(UserFormSettingsComponent.USER_FORM_SETTING_STORAGE_NAME);
    this.userFormSetting = savedUserFormSetting ? savedUserFormSetting : { gridNavigation: 'horizontal', incrementDateSelector: false };
  }

  public openDialog(): void {
    this.open = true;
  }

  protected onTabChange(selectedTab: 'linear' | 'grid'): void {
    // this.searchedIds = [];
    // this.searchName = '';
    // this.saveSearch = false;
    // if(selectedTab === 'linear'){
    //   this.loadStationSelections();
    // }
   
    this.activeTab = selectedTab;
   }

  protected get gridNavigation(): string {
    return this.userFormSetting.gridNavigation === 'vertical' ? 'Vertically' : 'Horizontally';
  }

  protected onGridEntryNavigationSelection(option: string): void {
    if (option === 'Vertically') {
      this.userFormSetting.gridNavigation = 'vertical';
    } else {
      this.userFormSetting.gridNavigation = 'horizontal';
    }

  }

  protected onOkClick(): void {
    this.localStorage.setItem(UserFormSettingsComponent.USER_FORM_SETTING_STORAGE_NAME, this.userFormSetting);
    this.open = false;
    this.ok.emit(this.userFormSetting);
    this.openChange.emit(this.open);
  }

  protected onCancelClick(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
