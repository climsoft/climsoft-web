import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { ObservationsService } from '../../services/observations.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { Last24HoursObservations } from '../../models/last-24-hours-observation.model';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/period-single-input/Intervals.util';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';


interface ObservationView extends Last24HoursObservations {
  elementAbbrv: string;
  sourceName: string;
  presentableDatetime: string;
  intervalName: string;
  valueFlag: string;
}

@Component({
  selector: 'app-station-data-monitoring',
  templateUrl: './station-data-monitoring.component.html',
  styleUrls: ['./station-data-monitoring.component.scss']
})
export class StationDataMonitoringComponent implements OnDestroy {

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
    this.generalSettingsService.findOne(2).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public showDialog(selectedStation: StationCacheModel): void {
    this.station = selectedStation;
    this.title = this.station.id + ' - ' + this.station.name
    this.open = true;

    this.observationsService.findStationObservationsInLast24Hours(selectedStation.id).pipe(
      take(1),
    ).subscribe(data => {
      console.log('24 hours observations', data);
      this.observations = data.map(observation => {
        let element = this.elements.find(item => item.id === observation.elementId);
        let source = this.sources.find(item => item.id === observation.sourceId); 
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
