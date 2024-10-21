
export interface UpdateGeneralSettingModel {
 // TODO. validate this depending on the setting id
  parameters: SettingsParametersValidity | null;

}

export interface SettingsParametersValidity{
  isValid(): boolean;
}

