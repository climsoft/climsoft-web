import { Component, EventEmitter, OnDestroy, Output } from '@angular/core'; 
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service'; 
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/interval-single-input/Intervals.util';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { Last24HoursObservations } from 'src/app/data-ingestion/models/last-24-hours-observation.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { StationStatusQueryModel } from '../models/station-status-query.model';
import { StationStatusDataQueryModel } from '../models/station-status-data-query.model';


interface ObservationView extends Last24HoursObservations {
  elementAbbrv: string;
  sourceName: string;
  presentableDatetime: string;
  intervalName: string;
  valueFlag: string;
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
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
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
        let valueFlag: string = '';

        if (!element) throw new Error('element not found');
        if (!source) throw new Error('source not found'); 

        if (observation.value) {
          valueFlag = `${observation.value} `
        }

        if (observation.flag) {
          valueFlag = `${valueFlag}${observation.flag[0].toUpperCase()}`
        }

        return {
          ...observation,
          elementAbbrv: element.abbreviation,
          sourceName: source.name,
          presentableDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
          intervalName: IntervalsUtil.getIntervalName(observation.interval),
          valueFlag: valueFlag
        }
      });
    });
  }

  protected onCancelClick(): void {
    this.closeClick.emit();
  }


}
