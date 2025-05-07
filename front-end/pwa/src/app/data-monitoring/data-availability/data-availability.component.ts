import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

import * as echarts from 'echarts';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { DataAvailabilityQueryModel } from './models/data-availability-query.model';
import { DataAvailabilityStatusModel } from 'src/app/data-ingestion/models/data-availability-status.model';

interface Observation {
  obsDef: CreateObservationModel;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements AfterViewInit, OnDestroy {
  private stationsMetadata: StationCacheModel[] = [];
  private elementsMetadata: ElementCacheModel[] = [];
  private sourcesMetadata: ViewSourceModel[] = [];

  protected enableQueryButton: boolean = true;
  private utcOffset: number = 0;

  private chartInstance!: echarts.ECharts;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private elementService: ElementsCacheService,
    private sourcesService: SourceTemplatesCacheService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');

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
    this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(document.getElementById('dataFlowMonitoringChart')!);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  protected onQueryClick(dataAvailabilityFilter: DataAvailabilityQueryModel): void {


    //console.log('filter: ', dataAvailabilityFilter);



    this.enableQueryButton = false;

    this.observationService.findDataAvailabilityStatus(dataAvailabilityFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {

        console.log('availability: ', data);

        const stationIds: string[] = dataAvailabilityFilter.stationIds;
        let dateValues: number[];

        switch (dataAvailabilityFilter.durationType) {
          case 'days_of_month':
            const [year, month] = dataAvailabilityFilter.durationDaysOfMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
            dateValues = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            //dateValues = DateUtils.getDaysInMonthList(year, month-1).map(item => item.id);
            break;

          case 'months_of_year':
            dateValues = Array.from({ length: 12 }, (_, i) => i + 1);;
            break;

          case 'years':
            dateValues = dataAvailabilityFilter.durationYears;
            break;
          default:
            throw new Error('Developer error. Duration type not supported');
        }



        // [stationIndex, dateValueIndex, value]
        const chartData: [number, number, number][] = [];
        let maxValue: number=0
        for (const item of data) {
    
          const stationIndex = stationIds.findIndex(stationId => stationId === item.stationId);
          if (stationIndex == -1) {
            continue;
          }

          const dateValueIndex = dateValues.findIndex(dateValue => dateValue === item.dateValue);
          if (dateValueIndex == -1) {
            continue;
          }

          chartData.push([stationIndex, dateValueIndex, item.recordCount]);

          if(item.recordCount> maxValue){
            maxValue = item.recordCount;
          }
        }


        const strDateValues: string[] = dateValues.map(item => item.toString());
        this.generateChart(stationIds, strDateValues, chartData,maxValue);
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Flow', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },
      complete: () => {
        this.enableQueryButton = true;
      }
    });
  }


  private generateChart(stations: string[], dateValues: string[], data: [number, number, number][], maxValue: number) {
    const chartOptions = {
      tooltip: { position: 'top' },
      grid: {
        height: '60%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: dateValues,
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: stations,
        splitArea: { show: true }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%'
      },
      series: [
        {
          name: 'Data Availability',
          type: 'heatmap',
          data: data,
          label: { show: true },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };

    this.chartInstance.setOption(chartOptions);
  }

  private getMaxNumber(numbers: number[]): number {
    if (numbers.length === 0) throw new Error("Array is empty");
    let max = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] > max) {
        max = numbers[i];
      }
    }
    return max;
  }

}
