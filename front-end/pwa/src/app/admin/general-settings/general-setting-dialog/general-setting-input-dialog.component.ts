import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewGeneralSettingModel } from '../models/view-general-setting.model';
import { GeneralSettingsCacheService } from '../services/general-settings.service';
import { UpdateGeneralSettingParametersModel } from '../models/update-general-setting.model';
import { SettingIdEnum } from '../models/setting-id.enum';
import { ClimsoftBoundaryModel } from '../models/settings/climsoft-boundary.model';
import { ClimsoftDisplayTimeZoneModel } from '../models/settings/climsoft-display-timezone.model';
import { SchedulerSettingModel } from '../models/settings/scheduler-setting.model';

@Component({
  selector: 'app-general-setting-input-dialog',
  templateUrl: './general-setting-input-dialog.component.html',
  styleUrls: ['./general-setting-input-dialog.component.scss']
})
export class GeneralSettingInputDialogComponent {

  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected setting!: ViewGeneralSettingModel;
  protected settingId: typeof SettingIdEnum = SettingIdEnum;

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsCacheService: GeneralSettingsCacheService,
  ) { }

  public showDialog(settingId: SettingIdEnum): void {
    this.open = true;
    this.generalSettingsCacheService.findOne(settingId).pipe(
      take(1),
    ).subscribe((data) => {
      if (data) this.setting = data;
    });
  }

  protected get climsoftBoundary(): ClimsoftBoundaryModel {
    return this.setting.parameters as ClimsoftBoundaryModel;
  }

  protected get climsoftDisplayTimeZone(): ClimsoftDisplayTimeZoneModel {
    return this.setting.parameters as ClimsoftDisplayTimeZoneModel;
  }

  protected get schedulerSetting(): SchedulerSettingModel {
    return this.setting.parameters as SchedulerSettingModel;
  }

  protected onSaveClick(): void {
    const settingParam: UpdateGeneralSettingParametersModel = {
      parameters: this.setting.parameters
    };

    this.generalSettingsCacheService.update(this.setting.id, settingParam).pipe(
      take(1),
    ).subscribe({
      next: (data) => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Setting Details', message: `${data.name} setting updated`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: (err) => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Setting Details', message: `Error updating ${err.message} setting`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }
}
