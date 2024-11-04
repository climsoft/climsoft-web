import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { RegionTypeEnum } from 'src/app/core/models/Regions/region-types.enum';
import { ViewRegionModel } from 'src/app/core/models/Regions/view-region.model';
import { ViewGeneralSettingModel } from 'src/app/core/models/settings/view-general-setting.model';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { RegionsService } from 'src/app/core/services/regions/regions.service';
import { GeneralSettingsService } from 'src/app/core/services/settings/general-settings.service';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-view-general-settings',
  templateUrl: './view-general-settings.component.html',
  styleUrls: ['./view-general-settings.component.scss']
})
export class ViewGeneralSettingsComponent {
  protected regions: ViewGeneralSettingModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('General Settings');

    // Get all sources 
    this.generalSettingsService.findAll().pipe(take(1)).subscribe((data) => {
      this.regions = data;
    });

  }

  protected onSearch(): void { }

  protected onEditGeneralSetting(generalSetting: ViewGeneralSettingModel): void {
    this.router.navigate(['edit-general-setting', generalSetting.id], { relativeTo: this.route.parent });
  }

}
