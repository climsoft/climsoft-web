import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UpdateGeneralSettingModel } from '../../models/settings/update-general-setting.model';
import { ViewGeneralSettingModel } from '../../models/settings/view-general-setting.model';
import { BaseStringAPIService } from '../base/base-string-api.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralSettingsService extends BaseStringAPIService<UpdateGeneralSettingModel, UpdateGeneralSettingModel, ViewGeneralSettingModel> {

  constructor(private http: HttpClient) {
    super(http, 'general-settings')
  } 

}
