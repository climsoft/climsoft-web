import { BehaviorSubject, Subject, take } from "rxjs";
import { RegionTypeEnum } from "src/app/core/models/Regions/region-types.enum";
import { ViewRegionQueryModel } from "src/app/core/models/Regions/view-region-query.model";
import { ViewRegionModel } from "src/app/core/models/Regions/view-region.model";
import { RegionsService } from "src/app/core/services/regions/regions.service";
import { PagingParameters } from "src/app/shared/controls/page-input/paging-parameters";

export class ViewRegionsDefinition {
    //TODO change this to filter changed and this class will no longer be needed
    public readonly entriesLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public regions: ViewRegionModel[] = []; 
    public pageInputDefinition: PagingParameters = new PagingParameters();
    private regionFilter!: ViewRegionQueryModel;

    constructor(
        private regionsService: RegionsService,
    ) { }

    public countEntries(): void {
        this.regions = [];
        this.regionFilter = {};
        this.pageInputDefinition.setTotalRowCount(0);

        this.regionsService.count(this.regionFilter).pipe(take(1)).subscribe(count => {
          
            this.pageInputDefinition.setTotalRowCount(count);
            if (count > 0) {
                this.loadEntries();
            }
        });
    }

    public loadEntries(): void {
        //TODO. for maps this won't work.
        this.regionFilter.page = this.pageInputDefinition.page;
        this.regionFilter.pageSize = this.pageInputDefinition.pageSize;
        this.regionsService.findRegions(this.regionFilter).pipe(take(1)).subscribe(data => {
            if (data) {
                this.regions = data;
                this.entriesLoaded.next(true);
            }
        });
    }

}