import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model'; 
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { DeleteObservationModel } from 'src/app/data-ingestion/models/delete-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/interval-single-input/Intervals.util'; 
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationsService } from '../../services/observations.service';
import { ObservationDefinition } from '../../form-entry/defintitions/observation.definition';

interface ObservationEntry {
  obsDef: ObservationDefinition; 
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-data-viewing',
  templateUrl: './data-viewing.component.html',
  styleUrls: ['./data-viewing.component.scss']
})
export class DataViewingComponent implements OnDestroy {
  protected observationsEntries: ObservationEntry[] = [];
  private stationsMetadata: StationCacheModel[] = [];
  private elementsMetadata: ElementCacheModel[] = [];
  private sourcesMetadata: ViewSourceModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
 
  protected enableQueryButton: boolean = true;
  protected numOfChanges: number = 0;
  protected allBoundariesIndices: number[] = [];
  private utcOffset: number = 0;

  private observationFilter!: ViewObservationQueryModel

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService, 
    private stationsCacheService: StationsCacheService,
    private elementService: ElementsCacheService,
    private sourcesService: SourceTemplatesCacheService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) { 

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.stationsMetadata = data;
    });

    this.elementService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.sourcesMetadata = data;
    });

    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(2).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return DataViewingComponent.name;
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.observationFilter = observationFilter;
     this.queryData();
  }

  protected queryData( ): void {
    this.enableQueryButton = false;
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);
    this.observationService.count(this.observationFilter).pipe(take(1)).subscribe(
      {
        next: count => {
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
          }else{
            this.pagesDataService.showToast({ title: 'Data Exploration', message: 'No data', type: ToastEventTypeEnum.INFO }); 
          }
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Data Exploration', message: err, type: ToastEventTypeEnum.ERROR });
        },
        complete: () => {
          this.enableQueryButton = true;
        }
      });
  }


  protected loadData( ): void {
    this.enableQueryButton = false; 
    this.numOfChanges = 0;
    this.allBoundariesIndices = [];
    this.observationsEntries = []; 
   this. observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;

    this.observationService.findCorrectionData(this.observationFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
      
        const observationsEntries: ObservationEntry[] = data.map(observation => {
  
          const stationMetadata = this.stationsMetadata.find(item => item.id === observation.stationId);
          if (!stationMetadata) {
            throw new Error("Developer error: Station not found.");
          }
  
          const elementMetadata = this.elementsMetadata.find(item => item.id === observation.elementId);
          if (!elementMetadata) {
            throw new Error("Developer error: Element not found.");
          }
  
          const sourceMetadata = this.sourcesMetadata.find(item => item.id === observation.sourceId);
          if (!sourceMetadata) {
            throw new Error("Developer error: Source not found.");
          }
  
          return {
            obsDef: new ObservationDefinition(observation, elementMetadata, sourceMetadata.allowMissingValue, false, undefined),
            newStationId: '',
            newElementId: 0,
            delete: false,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
          }
  
        });
  
        this.setRowBoundaryLineSettings(observationsEntries);
        this.observationsEntries = observationsEntries;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Exploration', message: err, type: ToastEventTypeEnum.ERROR });
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
