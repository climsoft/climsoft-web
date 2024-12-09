import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ViewGeneralSettingModel } from 'src/app/core/models/settings/view-general-setting.model';
import { GeneralSettingsService } from 'src/app/core/services/settings/general-settings.service';
import { UpdateGeneralSettingModel } from 'src/app/core/models/settings/update-general-setting.model'; 
import { Settings1ParamsModel } from 'src/app/core/models/settings/settings-params/settings-1-params.model';
import { SettingIds } from 'src/app/core/models/settings/setting-ids';

@Component({
  selector: 'app-edit-general-setting',
  templateUrl: './edit-general-setting.component.html',
  styleUrls: ['./edit-general-setting.component.scss']
})
export class EditGeneralSettingComponent implements OnInit {
  protected viewGeneralSetting!: ViewGeneralSettingModel;
  protected bEnableSave: boolean = true;//todo. should be false by default

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private generalSettingsService: GeneralSettingsService,
    private location: Location,
  ) {
    this.pagesDataService.setPageHeader('Edit General Setting');
  }

  ngOnInit() {
    const generalSettingId = this.route.snapshot.params['id'];
    this.generalSettingsService.findOne(generalSettingId).subscribe((data) => {
      this.viewGeneralSetting = data;
    });

  }

  protected get setting1Param(): Settings1ParamsModel {
    return this.viewGeneralSetting.parameters as Settings1ParamsModel;;
  }

  protected get isDefaultMapView(): string{
    return SettingIds.DEFAULT_MAP_VIEW;
  }

  protected onSaveClick(): void {
    // TODO. do validations

    const createUser: UpdateGeneralSettingModel = {
      parameters: this.viewGeneralSetting.parameters
    }

    this.bEnableSave = false;
    this.generalSettingsService.update(this.viewGeneralSetting.id, createUser).subscribe((data) => {
      this.bEnableSave = true;
      if (data) {
        this.pagesDataService.showToast({ title: 'Setting Details', message: `Setting ${data.id} updated`, type: ToastEventTypeEnum.SUCCESS });
        this.location.back();
      }
    });

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
