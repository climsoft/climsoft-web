import { Component, OnDestroy } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilityQueryModel } from './models/data-availability-query.model';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Router } from '@angular/router';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';


@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements OnDestroy {
  protected enableQueryButton: boolean = true;
  private dataAvailabilityFilter!: DataAvailabilityQueryModel;
  private stations: StationCacheModel[] = [];
  private chartInstance!: echarts.ECharts;
  private stationRendered!: StationCacheModel[];
  private dateValues!: number[];
  private utcOffset: number = 0;
  private user!: LoggedInUserModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private observationService: ObservationsService,
    private stationsCacheService: StationsCacheService,
    private generalSettingsService: GeneralSettingsService,
    private router: Router,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      this.user = user;
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.stations = stations;
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
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  protected onQueryClick(newDataAvailabilityFilter: DataAvailabilityQueryModel): void {

    this.enableQueryButton = false;
    this.dataAvailabilityFilter = newDataAvailabilityFilter;

    this.observationService.findDataAvailabilitySummary(this.dataAvailabilityFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.stationRendered =
          this.dataAvailabilityFilter.stationIds.length > 0 ?
            this.stations.filter(station => this.dataAvailabilityFilter.stationIds.includes(station.id)) : this.stations;

        const strStationValues: string[] = this.stationRendered.map(item => `${item.id} - ${item.name}`);// Used by heatmap chart to show labels in the y-axis
        this.dateValues = [];
        let strDateValues: string[]; // Used by heatmap chart to show labels in the x-axis
        let dateToolTipPrefix: string; // Used by heat map chart tooltip for x-axis prefix
        switch (this.dataAvailabilityFilter.durationType) {
          case 'days_of_month':
            const [year, month] = this.dataAvailabilityFilter.durationDaysOfMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
            this.dateValues = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            // Populate strDateValues with "1-Wed", "2-Thu", etc.
            strDateValues = this.dateValues.map(day => {
              const date = new Date(year, month - 1, day); // month is 0-based
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon", "Tue"
              return `${day}\n${weekday}`;
            });

            dateToolTipPrefix = 'Day';
            break;
          case 'months_of_year':
            this.dateValues = Array.from({ length: 12 }, (_, i) => i + 1);

            // Populate strDateValues with "1-Jan", "2-Feb", etc.
            strDateValues = this.dateValues.map(month => {
              const date = new Date(2025, month - 1); // use any year, just to get month name
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });
              return `${month}\n${monthName}`;
            });

            dateToolTipPrefix = 'Month';
            break;
          case 'years':
            this.dateValues = this.dataAvailabilityFilter.durationYears;
            strDateValues = this.dateValues.map(item => item.toString());
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

          const dateValueIndex = this.dateValues.findIndex(dateValue => dateValue === recordCountData.dateValue);
          if (dateValueIndex === -1) {
            continue;
          }

          const stationIndex = this.stationRendered.findIndex(station => station.id === recordCountData.stationId);
          if (stationIndex === -1) {
            continue;
          }

          chartData.push([dateValueIndex, stationIndex, recordCountData.recordCount]);

          if (recordCountData.recordCount > maxValue) {
            maxValue = recordCountData.recordCount;
          }
        }

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
        top: 50,
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
          xAxisIndex: 0,
          orient: 'horizontal',
          bottom: 15,     // Push it below visualMap if needed
          height: 30,
          left: 200,     // Align with the grid.left so it doesn't overlap Y labels
          right: 50,     // Match grid.right to avoid overlap with Y zoom
        },
        {
          type: 'inside',
          xAxisIndex: 0
        },
        {
          type: 'slider',
          yAxisIndex: 0,       // Targets Y-axis
          orient: 'vertical',  // Makes it vertical (important!)
          right: 10,            // Places it to the right of the chart
          top: 50,             // Distance from top 
          width: 30,           // Width of the zoom bar 
          height: '80%'
        },
        ,
        {
          type: 'inside',
          yAxisIndex: 0
        }      
      ],
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0,
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
        //const value = params.value[2]; // value
        const stationId: string = this.stationRendered[stationIndex].id; // stations[stationIndex].split(' ')[0];
        const dateComponent: number = Number(this.dateValues[dateIndex]);
        console.log(`Clicked cell - Station: ${stationId}, Date: ${dateComponent}`);
        this.showVariables(stationId, dateComponent);
      }
    });
  }

  private showVariables(stationId: string, dateComponent: number) {
    let fromDate: string;
    let toDate: string;
    switch (this.dataAvailabilityFilter.durationType) {
      case 'days_of_month':
        fromDate = `${this.dataAvailabilityFilter.durationDaysOfMonth}-${StringUtils.addLeadingZero(dateComponent)}`;
        toDate = fromDate;
        break;
      case 'months_of_year':
        const year: number = this.dataAvailabilityFilter.durationMonthsOfYear;
        const daysInMonth = new Date(year, dateComponent, 0).getDate(); // day 0 of next month = last day of this month
        const strMonthValue = StringUtils.addLeadingZero(dateComponent);
        fromDate = `${year}-${strMonthValue}-01`;
        toDate = `${year}-${strMonthValue}-${daysInMonth}`;
        break;
      case 'years':
        fromDate = `${dateComponent}-01-01`;
        toDate = `${dateComponent}-12-31`;
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

    const viewFilter: ViewObservationQueryModel = {};

    // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
    // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
    viewFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${fromDate}T00:00:00Z`, this.utcOffset, 'subtract');
    viewFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${toDate}T23:59:00Z`, this.utcOffset, 'subtract');

    viewFilter.stationIds = [stationId];

    if (this.dataAvailabilityFilter.elementIds && this.dataAvailabilityFilter.elementIds.length > 0) {
      viewFilter.elementIds = this.dataAvailabilityFilter.elementIds;
    }

    if (this.dataAvailabilityFilter.interval) {
      viewFilter.intervals = [this.dataAvailabilityFilter.interval]
    }

    if (this.dataAvailabilityFilter.level !== undefined) {
      viewFilter.level = this.dataAvailabilityFilter.level
    }

    //this.router.navigate(['/data-explorer'], { queryParams: { term: 'rainfall', year: 2024 } });

    let componentPath: string = '';
    if (this.user.isSystemAdmin) {
      // For admins just open data correction
      componentPath = 'data-ingestion/data-correction';
    } else if (this.user.permissions) {
      if (this.user.permissions.entryPermissions) {
        // If user has correction permissions then just open data correction      
        componentPath = 'data-ingestion/data-correction';
      } else if (this.user.permissions.ingestionMonitoringPermissions) {
        // If user has monitorig permissions then just open data explorer 
        componentPath = '/data-monitoring/data-explorer';
      }
    }

    if (componentPath) {
      const serialisedUrl = this.router.serializeUrl(
        this.router.createUrlTree([componentPath], { queryParams: viewFilter })
      );

      window.open(serialisedUrl, '_blank');
    }


  }

}
