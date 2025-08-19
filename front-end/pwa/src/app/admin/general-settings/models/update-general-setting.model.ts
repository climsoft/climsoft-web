
export interface UpdateGeneralSettingModel { 
  parameters: SettingsParametersValidity | null;
}

export interface SettingsParametersValidity{
  isValid(): boolean;
}

