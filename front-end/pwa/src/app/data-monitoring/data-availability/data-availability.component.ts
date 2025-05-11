import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { DataAvailabilityQueryModel } from './models/data-availability-query.model';
import { StationDataComponent } from '../station-status/station-status-data/station-status-data.component';



@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements AfterViewInit, OnDestroy {
  //@ViewChild('appStationDataAvailability') appStationDataMonitoring!: StationDataComponent;

  protected enableQueryButton: boolean = true; 

  private chartInstance!: echarts.ECharts;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService, 
  ) {
    this.pagesDataService.setPageHeader('Data Availability');

   
  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(document.getElementById('dataAvailabilityChart')!);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  protected onQueryClick(dataAvailabilityFilter: DataAvailabilityQueryModel): void {

    this.enableQueryButton = false;

    this.observationService.findDataAvailabilityStatus(dataAvailabilityFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {

        console.log('data availabe: ', data);

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



        // Follow [x-index, y-index, value] format
        // [dateValueIndex, stationIndex,  value]
        const chartData: [number, number, number][] = [];
        let maxValue: number = 0
        for (const item of data) {

          const dateValueIndex = dateValues.findIndex(dateValue => dateValue === item.dateValue);
          if (dateValueIndex === -1) {
            continue;
          }

          const stationIndex = stationIds.findIndex(stationId => stationId === item.stationId);
          if (stationIndex === -1) {
            continue;
          }

          chartData.push([dateValueIndex, stationIndex, item.recordCount]);

          if (item.recordCount > maxValue) {
            maxValue = item.recordCount;
          }
        }


        // Because x-axis echart values are categorical, convert them to string array
        const strDateValues: string[] = dateValues.map(item => item.toString());
        this.generateChart(strDateValues, stationIds, chartData, maxValue);
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


  private generateChart(dateValues: string[], stations: string[], data: [number, number, number][], maxValue: number) {
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

    // Add click handler
    this.chartInstance.off('click'); // remove any previous handler to avoid duplicates
    this.chartInstance.on('click', (params: any) => {
      if (params.seriesType === 'heatmap') {
        const dateIndex = params.value[0];    // x-axis index (date)
        const stationIndex = params.value[1]; // y-axis index (station)
      

        const stationId = stations[stationIndex];
        const dateValue = dateValues[dateIndex];
        const value = params.value[2];

        console.log(`Clicked cell - Station: ${stationId}, Date: ${dateValue}, Value: ${value}`);

      }
    });
  }

}
