import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CreateViewGeneralSettingModel } from 'src/app/settings/general-settings/models/create-view-general-setting.model';
import { GeneralSettingsService } from 'src/app/settings/general-settings/services/general-settings.service';
import { UpdateGeneralSettingModel } from 'src/app/settings/general-settings/models/update-general-setting.model'; 
import { ClimsoftBoundaryModel } from 'src/app/settings/general-settings/models/settings/climsoft-boundary.model';

@Component({
  selector: 'app-edit-general-setting',
  templateUrl: './edit-general-setting.component.html',
  styleUrls: ['./edit-general-setting.component.scss']
})
export class EditGeneralSettingComponent implements OnInit {
  protected setting!: CreateViewGeneralSettingModel;
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
    this.generalSettingsService.findOne(+generalSettingId).subscribe((data) => {
      this.setting = data;
    });

  }


  protected onSaveClick(): void {
    // TODO. do validations

    const settingParam: UpdateGeneralSettingModel = {
      parameters: this.setting.parameters
    }

    this.bEnableSave = false;
    this.generalSettingsService.update(this.setting.id, settingParam).subscribe((data) => {
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
