import { BehaviorSubject, take } from "rxjs";
import { ViewStationQueryModel } from "src/app/core/models/stations/view-station-query.model";
import { ViewStationModel } from "src/app/core/models/stations/view-station.model";
import { StationsService } from "src/app/core/services/stations/stations.service";
import { PagingParameters } from "src/app/shared/controls/page-input/paging-parameters";

export class ViewStationsDefinition {
    public readonly entriesLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    public stations: ViewStationModel[] = [];
    public pageInputDefinition: PagingParameters = new PagingParameters();
    private stationFilter!: ViewStationQueryModel;

    constructor(
        private stationsService: StationsService
    ) { }

    public countEntries(): void {
        this.stations = [];
        this.stationFilter = {};
        this.pageInputDefinition.setTotalRowCount(0);

        this.stationsService.count(this.stationFilter).pipe(take(1)).subscribe(count => {
            this.pageInputDefinition.setTotalRowCount(count);
            if (count > 0) {
                this.loadEntries();
            }
        });
    }

    public loadEntries(): void {
        this.stationFilter.page = this.pageInputDefinition.page;
        this.stationFilter.pageSize = this.pageInputDefinition.pageSize;
        this.stationsService.find(this.stationFilter).pipe(take(1)).subscribe(data => {
            if (data) {
                this.stations = data;
                this.entriesLoaded.next(true);
            }
        });
    }

}