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
  private stations: StationCacheModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private stationsCacheService: StationsCacheService,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.stations = stations;
    });
  }

  ngAfterViewInit(): void {
    //this.chartInstance = echarts.init(document.getElementById('dataAvailabilityChart'));
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
        const stationFetched: StationCacheModel[] =
          dataAvailabilityFilter.stationIds.length > 0 ?
            this.stations.filter(station => dataAvailabilityFilter.stationIds.includes(station.id)) : this.stations;

        let dateValues: number[];
        let strDateValues: string[]; // Used by heatmap chart to show labels in the x-axis
        let dateToolTipPrefix: string; // Used by heat map chart tooltip for x-axis prefix
        switch (dataAvailabilityFilter.durationType) {
          case 'days_of_month':
            const [year, month] = dataAvailabilityFilter.durationDaysOfMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
            dateValues = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            // Populate strDateValues with "1-Wed", "2-Thu", etc.
            strDateValues = dateValues.map(day => {
              const date = new Date(year, month - 1, day); // month is 0-based
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon", "Tue"
              return `${day}\n${weekday}`;
            });

            dateToolTipPrefix = 'Day';
            break;
          case 'months_of_year':
            dateValues = Array.from({ length: 12 }, (_, i) => i + 1);

            // Populate strDateValues with "1-Jan", "2-Feb", etc.
            strDateValues = dateValues.map(month => {
              const date = new Date(2025, month - 1); // use any year, just to get month name
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });
              return `${month}\n${monthName}`;
            });

            dateToolTipPrefix = 'Month';
            break;
          case 'years':
            dateValues = dataAvailabilityFilter.durationYears;
            strDateValues = dateValues.map(item => item.toString());
            dateToolTipPrefix = 'Year';
            break;
          default:
            throw new Error('Developer error. Duration type not supported');
        }


        // Follow [x-index, y-index, value] format
        // [dateValueIndex, stationIndex,  value]
        const chartData: [number, number, number][] = [];
        let maxValue: number = 0
        for (const recordCountData of data) {

          const dateValueIndex = dateValues.findIndex(dateValue => dateValue === recordCountData.dateValue);
          if (dateValueIndex === -1) {
            continue;
          }

          const stationIndex = stationFetched.findIndex(station => station.id === recordCountData.stationId);
          if (stationIndex === -1) {
            continue;
          }

          chartData.push([dateValueIndex, stationIndex, recordCountData.recordCount]);

          if (recordCountData.recordCount > maxValue) {
            maxValue = recordCountData.recordCount;
          }
        }



        const strStationValues: string[] = stationFetched.map(item => `${item.id} - ${item.name}`);
        this.generateChart(strDateValues, strStationValues, chartData, maxValue, dateToolTipPrefix);
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

  private generateChart(dateValues: string[], stations: string[], data: [number, number, number][], maxValue: number, dateToolTipPrefix: string) {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }

    this.chartInstance = echarts.init(document.getElementById('dataAvailabilityChart'));

    const chartOptions = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [xIdx, yIdx, value] = params.value;
          return `
          <strong>Station:</strong> ${stations[yIdx]}<br/>
          <strong>${dateToolTipPrefix}:</strong> ${dateValues[xIdx]}<br/>
          <strong>Count:</strong> ${value}
          `;
        }
      },
      grid: {
        height: '80%',
        top: 4,
        left: 200,
        right: 70
      },
      xAxis: {
        type: 'category',
        data: dateValues,
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: stations,
        splitArea: { show: true },
        axisLabel: {
          show: true,
          formatter: (value: string) => {
            // Optional: truncate long labels or wrap if necessary
            return value.length > 27 ? value.slice(0, 24) + '…' : value;
          },
          overflow: 'truncate', // could also try 'break', 'none', or 'breakAll'
        }
      },
      dataZoom: [
        {
          type: 'slider',
          yAxisIndex: 0,       // Targets Y-axis
          orient: 'vertical',  // Makes it vertical (important!)
          right: 10,            // Places it to the right of the chart
          top: 4,             // Distance from top 
          width: 30,           // Width of the zoom bar 
          height: '80%'
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          orient: 'horizontal',
          bottom: 60,     // Push it below visualMap if needed
          height: 30,
          left: 200,     // Align with the grid.left so it doesn't overlap Y labels
          right: 50,     // Match grid.right to avoid overlap with Y zoom
        }
      ],
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0
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


        const stationId = stations[stationIndex].split(' ');
        const dateValue = dateValues[dateIndex];
        const value = params.value[2];

        console.log(`Clicked cell - Station: ${stationId}, Date: ${dateValue}, Value: ${value}`);

      }
    });
  }

  private showVariables(stationId: string, dateValue: number) {

  }

}
