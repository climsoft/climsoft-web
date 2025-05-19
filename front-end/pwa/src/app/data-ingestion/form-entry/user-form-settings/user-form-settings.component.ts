import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UserSettingEnum } from 'src/app/app-config.service';
import { AppDatabase } from 'src/app/app-database';

export interface UserFormSettingStruct {
  displayExtraInformationOption: boolean,
  incrementDateSelector: boolean;
  fieldsBorderSize: number;

  linearLayoutSettings: {
    height: number;
    maxRows: number;
  }

  gridLayoutSettings: {
    height: number;
    navigation: 'horizontal' | 'vertical';
  }
}

export const DEFAULT_USER_FORM_SETTINGS: UserFormSettingStruct = {
  displayExtraInformationOption: false,
  incrementDateSelector: false,
  fieldsBorderSize: 1,
  linearLayoutSettings: {
    height: 60,
    maxRows: 5
  },
  gridLayoutSettings: {
    height: 60,
    navigation: 'horizontal',
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
  public ok = new EventEmitter<void>();

  protected activeTab: 'linear' | 'grid' = 'linear';

  protected userFormSettings!: UserFormSettingStruct;


  constructor() {
    this.loadUserSettings();
  }

  private async loadUserSettings() {
    const savedUserFormSetting = await AppDatabase.instance.userSettings.get(UserSettingEnum.ENTRY_FORM_SETTINGS);
    this.userFormSettings = savedUserFormSetting ? savedUserFormSetting.parameters : { ...DEFAULT_USER_FORM_SETTINGS }; //pass by value. Important    
  }

  public openDialog(): void {
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
    await AppDatabase.instance.userSettings.put({ name: UserSettingEnum.ENTRY_FORM_SETTINGS, parameters: this.userFormSettings });
    this.open = false;
    this.ok.emit();
    this.openChange.emit(this.open);
  }

  protected onCancelClick(): void {
    this.open = false;
    this.openChange.emit(this.open);
  }
}
