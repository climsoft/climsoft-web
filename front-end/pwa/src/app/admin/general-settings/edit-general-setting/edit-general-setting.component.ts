import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CreateViewGeneralSettingModel } from '../models/create-view-general-setting.model';
import { GeneralSettingsService } from '../services/general-settings.service';
import { UpdateGeneralSettingModel } from '../models/update-general-setting.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-edit-general-setting',
  templateUrl: './edit-general-setting.component.html',
  styleUrls: ['./edit-general-setting.component.scss']
})
export class EditGeneralSettingComponent implements OnInit, OnDestroy {
  protected setting!: CreateViewGeneralSettingModel;
  private destroy$ = new Subject<void>();

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
    this.generalSettingsService.findOne(+generalSettingId).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      if (data) this.setting = data;
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    // TODO. do validations

    const settingParam: UpdateGeneralSettingModel = {
      parameters: this.setting.parameters
    }

    this.generalSettingsService.update(this.setting.id, settingParam).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: 'Setting Details', message: `Setting ${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
        this.location.back();
      }
    });

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
