import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { RegionTypeEnum } from 'src/app/core/models/Regions/region-types.enum';
import { ViewRegionQueryModel } from 'src/app/core/models/Regions/view-region-query.model';
import { ViewRegionModel } from 'src/app/core/models/Regions/view-region.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { RegionsService } from 'src/app/core/services/regions/regions.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent {
  protected regions: ViewRegionModel[] = [];
  protected regionType: RegionTypeEnum | null = null;
  protected enableView: boolean = true;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private regionFilter!: ViewRegionQueryModel;

  constructor(
    private pagesDataService: PagesDataService,
    private regionsService: RegionsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Regions Metadata');

    // Get all sources 
    this.refresh();
  }

  protected refresh(): void{
    this.regions = [];
    this.regionFilter = {};

    this.pageInputDefinition.setTotalRowCount(0);
    this.enableView = false;
    this.regionsService.count(this.regionFilter).pipe(take(1)).subscribe(count => {
      this.enableView = true;
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadEntries();
      }
    });
  }

  protected loadEntries(): void { 
    this.regionFilter.page = this.pageInputDefinition.page;
    this.regionFilter.pageSize = this.pageInputDefinition.pageSize;
    this.regionsService.findRegions(this.regionFilter).pipe(take(1)).subscribe(data => {
      if(data){
        this.enableView = true;
        this.regions = data; 
      }         
    });
  }

  protected get firstRowNum(): number { 

    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;;
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
