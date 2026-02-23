import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CreateViewGeneralSettingModel } from '../models/create-view-general-setting.model';
import { GeneralSettingsService } from '../services/general-settings.service';
import { UpdateGeneralSettingModel } from '../models/update-general-setting.model';
import { SettingIdEnum } from '../models/setting-id.enum';

@Component({
  selector: 'app-general-setting-input-dialog',
  templateUrl: './general-setting-input-dialog.component.html',
  styleUrls: ['./general-setting-input-dialog.component.scss']
})
export class GeneralSettingInputDialogComponent {

  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected setting!: CreateViewGeneralSettingModel;

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
  ) { }

  public showDialog(settingId: SettingIdEnum): void {
    this.open = true;
    this.title = 'Edit General Setting';
    this.generalSettingsService.findOne(settingId).pipe(
      take(1),
    ).subscribe((data) => {
      if (data) this.setting = data;
    });
  }

  protected onSaveClick(): void {
    const settingParam: UpdateGeneralSettingModel = {
      parameters: this.setting.parameters
    };

    this.generalSettingsService.update(this.setting.id, settingParam).pipe(
      take(1),
    ).subscribe({
      next: (data) => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Setting Details', message: `Setting ${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: (err) => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Setting Details', message: `Error updating setting - ${err.message}`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }
}
