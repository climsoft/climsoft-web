import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { RegionTypeEnum } from 'src/app/core/models/Regions/region-types.enum';
import { ViewRegionModel } from 'src/app/core/models/Regions/view-region.model';
import { SourceTypeEnum } from 'src/app/core/models/sources/source-type.enum';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { RegionsService } from 'src/app/core/services/regions/regions.service';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent {
  protected regions: ViewRegionModel[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private regionService: RegionsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Regions Metadata');

    // Get all sources 
    this.regionService.findAll().pipe(take(1)).subscribe((data) => {
      this.regions = data;

      console.log('regions', this.regions);
    });

  }

  protected onSearch(): void { }

  protected onImportRegion() {
    this.router.navigate(['import-regions'], { relativeTo: this.route.parent });
  }

  //TODO. To be used for formatting the enum in future
  // protected getFormattedEnum(regionType: RegionTypeEnum): string {
  //   return StringUtils.formatEnumForDisplay(regionType);
  // }

}
