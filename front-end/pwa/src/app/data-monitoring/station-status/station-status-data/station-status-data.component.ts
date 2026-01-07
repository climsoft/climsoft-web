import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-specifications/services/source-templates-cache.service';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { LastStationActivityObservation } from 'src/app/data-ingestion/models/last-station-activity-observation.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { StationStatusDataQueryModel } from '../models/station-status-data-query.model';


interface ObservationView extends LastStationActivityObservation {
  elementId: number;
  elementName: string;
  sourceName: string;
  presentableDatetime: string;
  intervalName: string;
  valueStr: string;
  flagStr: string;
}

@Component({
  selector: 'app-station-status-data',
  templateUrl: './station-status-data.component.html',
  styleUrls: ['./station-status-data.component.scss']
})
export class StationDataComponent implements OnDestroy {

  @Output()
  public closeClick = new EventEmitter<void>();

  protected station!: StationCacheModel;
  protected open: boolean = false;
  protected title: string = '';
  protected observations!: ObservationView[];
  protected elements!: ElementCacheModel[];
  protected sources!: ViewSourceModel[];
  private utcOffset: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private elementsCacheService: ElementsCacheService,
    private sourcesCacheService: SourceTemplatesCacheService,
    private generalSettingsService: GeneralSettingsService,
    private observationsService: ObservationsService,
  ) {
    this.elementsCacheService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.elements = data;
    });

    this.sourcesCacheService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.sources = data;
    });

    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      if(data) this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public showDialog(selectedStation: StationCacheModel, stationStatusDataFilter: StationStatusDataQueryModel): void {
    this.station = selectedStation;
    this.title = this.station.id + ' - ' + this.station.name
    this.open = true;

    this.observationsService.findStationsObservationStatusData(selectedStation.id, stationStatusDataFilter).pipe(
      take(1),
    ).subscribe(data => {
      this.observations = data.map(observation => {
        const element = this.elements.find(item => item.id === observation.elementId);
        const source = this.sources.find(item => item.id === observation.sourceId);

        if (!element) throw new Error('element not found');
        if (!source) throw new Error('source not found');

        const valueStr: string = observation.value === null ? '' : `${observation.value}`;;
        const flagStr: string = observation.flag === null ? '' : `${observation.flag[0].toUpperCase()}`;
        return {
          ...observation,
          elementId: element.id,
          elementName: element.name,
          sourceName: source.name,
          presentableDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
          intervalName: IntervalsUtil.getIntervalName(observation.interval),
          valueStr: valueStr,
          flagStr: flagStr,
        }
      });
    });
  }

  protected onCancelClick(): void {
    this.closeClick.emit();
  }


}
