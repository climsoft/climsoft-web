import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewGeneralSettingModel } from '../models/view-general-setting.model';
import { GeneralSettingsCacheService } from '../services/general-settings.service';
import { GeneralSettingInputDialogComponent } from '../general-setting-dialog/general-setting-input-dialog.component';
import { SettingIdEnum } from '../models/setting-id.enum';

@Component({
  selector: 'app-view-general-settings',
  templateUrl: './view-general-settings.component.html',
  styleUrls: ['./view-general-settings.component.scss']
})
export class ViewGeneralSettingsComponent implements OnDestroy {
  @ViewChild('dlgEditSetting') dlgEditSetting!: GeneralSettingInputDialogComponent;

  protected settings: ViewGeneralSettingModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsCacheService,
  ) {
    this.pagesDataService.setPageHeader('General Settings');
    this.loadSettings();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSettings(): void {
    this.generalSettingsService.cachedGeneralSettings.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.settings = data;
    });
  }

  protected onSettingClick(settingId: SettingIdEnum): void {
    this.dlgEditSetting.showDialog(settingId);
  }

  protected onSettingSaved(): void {
    this.loadSettings();
  }
}
