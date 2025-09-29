import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ObservationDefinition } from 'src/app/data-ingestion/form-entry/defintitions/observation.definition';
import { ActivatedRoute } from '@angular/router';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  stationName: string;
  elementId: number;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-data-explorer',
  templateUrl: './data-explorer.component.html',
  styleUrls: ['./data-explorer.component.scss']
})
export class DataExplorerComponent implements OnInit, OnDestroy {
  protected observationsEntries!: ObservationEntry[];
  protected queryFilter!: ViewObservationQueryModel;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset!: number;
  private allMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private route: ActivatedRoute,
  ) {

    this.pagesDataService.setPageHeader('Data Explorer');

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
       if (!allMetadataLoaded) return;
      this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
      this.allMetadataLoaded = allMetadataLoaded;
      this.queryData();
    });


  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.keys.length === 0) return;

      const stationIds: string[] = params.getAll('stationIds');
      const elementIds: string[] = params.getAll('elementIds');
      const intervals: string[] = params.getAll('intervals');
      const level: string | null = params.get('level');
      const fromDate: string | null = params.get('fromDate');
      const toDate: string | null = params.get('toDate');

      this.queryFilter = { deleted: false };
      if (stationIds.length > 0) this.queryFilter.stationIds = stationIds;
      if (elementIds.length > 0) this.queryFilter.elementIds = elementIds.map(Number);
      if (intervals.length > 0) this.queryFilter.intervals = intervals.map(Number);
      if (level !== null) this.queryFilter.level = Number(level);
      if (fromDate) this.queryFilter.fromDate = fromDate;
      if (toDate) this.queryFilter.toDate = toDate;

      this.queryData();

    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return DataExplorerComponent.name;
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = observationFilter;
    this.queryData();
  }

  protected queryData(): void {
    if (!(this.allMetadataLoaded && this.queryFilter && this.utcOffset !== undefined)) {
      return;
    }

    console.log('querying data...');

    this.enableQueryButton = false;
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.observationService.count(this.queryFilter).pipe(take(1)).subscribe(
      {
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
          } else {
            this.pagesDataService.showToast({ title: 'Data Exploration', message: 'No data', type: ToastEventTypeEnum.INFO });
          }
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Data Exploration', message: err, type: ToastEventTypeEnum.ERROR });
          this.enableQueryButton = true;
        },
      });
  }


  protected loadData(): void {
    this.enableQueryButton = false;
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findProcessed(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {

        const observationsEntries: ObservationEntry[] = data.map(observation => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(observation.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(observation.elementId);
          const sourceMetadata = this.cachedMetadataSearchService.getSource(observation.sourceId);

          const observationView: ObservationEntry = {
            obsDef: new ObservationDefinition(this.cachedMetadataSearchService, observation, false),
            stationName: stationMetadata.name,
            elementId: elementMetadata.id,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
          }
          return observationView;

        });

        this.setRowBoundaryLineSettings(observationsEntries);
        this.observationsEntries = observationsEntries;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Exploration', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },
      complete: () => {
        this.enableQueryButton = true;
      }
    });
  }

  protected setRowBoundaryLineSettings(observationsEntries: ObservationEntry[]): void {
    const obsIdentifierMap = new Map<string, number>();

    for (let i = 0; i < observationsEntries.length; i++) {
      const obs = observationsEntries[i].obsDef.observation;
      const obsIdentifier = `${obs.stationId}-${obs.elementId}-${obs.level}-${obs.interval}-${obs.datetime}`;
      // Update the map with the latest index for each unique identifier
      obsIdentifierMap.set(obsIdentifier, i);
    }

    // set all last occurrence indices as boundaries
    this.allBoundariesIndices = Array.from(obsIdentifierMap.values());
    // If length indices array is the same as entries, then no need to show boundaries
    if (observationsEntries.length === this.allBoundariesIndices.length) {
      this.allBoundariesIndices = [];
    }
  }

  protected includeLowerBoundaryLine(index: number): boolean {
    return this.allBoundariesIndices.includes(index);
  }


  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
