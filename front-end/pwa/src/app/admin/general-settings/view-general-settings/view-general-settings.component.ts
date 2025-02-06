import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { CreateViewGeneralSettingModel } from '../models/create-view-general-setting.model';
import { GeneralSettingsService } from '../services/general-settings.service';

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

  protected onEditGeneralSetting(generalSetting: CreateViewGeneralSettingModel): void {
    this.router.navigate(['edit-general-setting', generalSetting.id], { relativeTo: this.route.parent });
  }

}
