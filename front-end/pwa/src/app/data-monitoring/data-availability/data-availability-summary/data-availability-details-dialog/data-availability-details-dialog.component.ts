import { Component, ViewChild } from '@angular/core';
import { DataAvailabilitySummaryQueryModel } from '../../models/data-availability-summary-query.model';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { DataAvailabilityHeatmapComponent, DataAvailabilityCellClickEvent } from '../data-availability-heatmap/data-availability-heatmap.component';
import { DataCorrectorComponent } from 'src/app/data-ingestion/data-correction/data-corrector/data-corrector.component';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
    selector: 'app-data-availability-details-dialog',
    templateUrl: './data-availability-details-dialog.component.html',
    styleUrls: ['./data-availability-details-dialog.component.scss']
})
export class DataAvailabilityDetailsDialogComponent {
    @ViewChild('heatmap') private heatmap!: DataAvailabilityHeatmapComponent;
    @ViewChild('dataCorrector') private dataCorrector!: DataCorrectorComponent;

    protected open = false;
    protected activeTab: 'drilldown' | 'viewdata' = 'drilldown';
    protected enableSubmitButton = false;

    private filterStack: DataAvailabilitySummaryQueryModel[] = [];
    private stationsPermitted: StationCacheModel[] = [];
    protected hideDrillDown: boolean = false;

    constructor(private cachedMetadataService: CachedMetadataService,) { }

    protected get currentFilter(): DataAvailabilitySummaryQueryModel {
        return this.filterStack[this.filterStack.length - 1];
    }

    protected get canGoBack(): boolean {
        return this.filterStack.length > 1;
    }

    public openDialog(filter: DataAvailabilitySummaryQueryModel, stationsPermitted: StationCacheModel[], hideDrillDown: boolean): void {
        this.filterStack = [{ ...filter }];
        this.stationsPermitted = stationsPermitted;
        this.enableSubmitButton = false;
        this.hideDrillDown = hideDrillDown;
        this.activeTab = hideDrillDown ? 'viewdata' : 'drilldown';
        this.open = true;
        this.queryChildren();
    }

    protected onCellClick(event: DataAvailabilityCellClickEvent): void {
        this.filterStack.push(event.derivedFilter);
        this.enableSubmitButton = false;
        this.hideDrillDown = event.hideDrillDown;
        this.activeTab = event.hideDrillDown ? 'viewdata' : 'drilldown';
        this.queryChildren();
    }

    protected onBack(): void {
        if (this.canGoBack) {
            this.filterStack.pop();
            this.enableSubmitButton = false;
            this.hideDrillDown = false;
            this.activeTab = 'drilldown';
            this.queryChildren();
        }
    }

    protected onTabChange(tab: 'drilldown' | 'viewdata'): void {
        this.activeTab = tab;
        this.queryChildren();
    }

    protected onUserChanges(count: number): void {
        this.enableSubmitButton = count > 0;
    }

    protected onSubmit(): void {
        if (this.enableSubmitButton) {
            this.dataCorrector.submit();
        }
    }

    private queryChildren(): void {
        // Put in set timeout to allow for the children to be created into the DOM by Angular
        setTimeout(() => {
            if (this.activeTab === 'drilldown') {
                this.heatmap.executeQuery(this.currentFilter, this.stationsPermitted);
            } else if (this.activeTab === 'viewdata') {
                this.dataCorrector.executeQuery(this.toObservationFilter(this.currentFilter));
            }
        });
    }

    private toObservationFilter(filter: DataAvailabilitySummaryQueryModel): ViewObservationQueryModel {
        const viewFilter: ViewObservationQueryModel = {
            deleted: false,
            fromDate: filter.fromDate,
            toDate: filter.toDate,
        };
        if (filter.stationIds) viewFilter.stationIds = filter.stationIds;
        if (filter.elementIds) viewFilter.elementIds = filter.elementIds;
        if (filter.level !== undefined) viewFilter.level = filter.level;
        if (filter.interval) viewFilter.intervals = [filter.interval];
        return viewFilter;
    }

    protected getPresentableDateTime(dateTime: string): string {
        return DateUtils.getPresentableDatetime(dateTime, this.cachedMetadataService.utcOffSet);
    }
}
