import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { CreateViewGeneralSettingModel } from 'src/app/settings/general-settings/models/create-view-general-setting.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { GeneralSettingsService } from 'src/app/settings/general-settings/services/general-settings.service';

@Component({
  selector: 'app-view-general-settings',
  templateUrl: './view-general-settings.component.html',
  styleUrls: ['./view-general-settings.component.scss']
})
export class ViewGeneralSettingsComponent {
  protected settings: CreateViewGeneralSettingModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('General Settings');

    // Get all sources 
    this.generalSettingsService.findAll().pipe(take(1)).subscribe((data) => {
      this.settings = data;
    });

  }

  protected onSearch(): void { }

  protected onEditGeneralSetting(generalSetting: CreateViewGeneralSettingModel): void {
    this.router.navigate(['edit-general-setting', generalSetting.id], { relativeTo: this.route.parent });
  }

}
