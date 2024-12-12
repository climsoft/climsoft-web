import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { take } from 'rxjs';
import { Period, PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { DuplicateModel, SourceCheckService } from 'src/app/core/services/observations/source-check.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';


@Component({
  selector: 'app-source-check',
  templateUrl: './source-check.component.html',
  styleUrls: ['./source-check.component.scss']
})
export class SourceCheckComponent {

  protected totalRecords: number = 0;

  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected period: number | null = null;
  protected elevation: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: DuplicateModel[] = [];
  protected stationsMetdata: StationCacheModel[] = [];
  private elementsMetadata: ElementCacheModel[] = []; 
  private periods: Period[] = PeriodsUtil.possiblePeriods;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableView: boolean = true;
  protected sumOfDuplicates: number = 0;

  constructor(
    private stationsService: StationsCacheService,
    private elementService: ElementsCacheService, 
    private sourceCheckService: SourceCheckService
  ) {

    this.stationsService.cachedStations.pipe(take(1)).subscribe(data => {
      this.stationsMetdata = data;
    });

    this.elementService.cachedElements.pipe(take(1)).subscribe(data => {
      this.elementsMetadata = data;
    });

  }

  protected loadData(): void {
    this.sumOfDuplicates = 0;
    this.observationsEntries = [];
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.sourceCheckService.find(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.observationsEntries = data;
    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected getStationName(duplicate: DuplicateModel): string {
    const name = this.stationsMetdata.find(item => (item.id === duplicate.stationId))?.name;
    return name ? name : '';
  }

  protected getElementAbbrv(duplicate: DuplicateModel): string {
    const name = this.elementsMetadata.find(item => (item.id === duplicate.elementId))?.abbreviation;
    return name ? name : '';
  }

  protected getFormattedDatetime(strDateTime: string): string {
    return strDateTime.replace('T', ' ').replace('Z', '');
  }

  protected getPeriodName(minutes: number): string {
    const periodFound = this.periods.find(item => item.id === minutes);
    return periodFound ? periodFound.name : minutes + 'mins';
  }

  protected onViewClick(): void {
    // Get the data based on the selection filter
    this.observationFilter = {deleted: false};

    if (this.stationId !== null) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.elementId !== null) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.period !== null) {
      this.observationFilter.period = this.period;
    }

    if (this.elevation !== null) {
      this.observationFilter.elevation = this.elevation;
    }

    if (this.sourceId !== null) {
      this.observationFilter.sourceIds = [this.sourceId];
    }

    // TODO. Investigate. If this is set to false, the dto is sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    if (this.fromDate !== null) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate !== null) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.enableView = false;
    this.sourceCheckService.count(this.observationFilter).pipe(take(1)).subscribe(count => {
      this.enableView = true;
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadData();
        this.sourceCheckService.sum(this.observationFilter).pipe(take(1)).subscribe(sum => {
          this.sumOfDuplicates = sum;
        });

      }
    });

  }


}
