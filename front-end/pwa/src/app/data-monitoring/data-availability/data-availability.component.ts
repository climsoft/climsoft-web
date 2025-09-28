import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilityQueryModel, DurationTypeEnum } from './models/data-availability-query.model';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ActivatedRoute, Router } from '@angular/router';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { DataAvailabilityOptionsDialogComponent } from './data-availability-options-dialog/data-availability-options-dialog.component';

@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements OnInit, OnDestroy {
  @ViewChild('appDataAvailabilityOptionsDialog') dataAvailabilityOptionsDialogComponent!: DataAvailabilityOptionsDialogComponent;

  protected enableQueryButton: boolean = true;
  protected filter!: DataAvailabilityQueryModel;
  private allStations!: StationCacheModel[];
  private chartInstance!: echarts.ECharts;
  private stationsRendered!: StationCacheModel[];
  private datesRendered!: number[];
  private utcOffset!: number;

  private heatMapDateValues!: string[]; // Used by heatmap chart to show labels in the x-axis
  private heatMapStationValues!: string[];// Used by heatmap chart to show labels in the y-axis

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private route: ActivatedRoute,
  ) {

    this.pagesDataService.setPageHeader('Data Availability');



  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.keys.length > 0) {
        const stationIds: string[] = params.getAll('stationIds');
        const elementIds: string[] = params.getAll('elementIds');
        const interval: string | null = params.get('interval');
        const level: string | null = params.get('level');
        const excludeConfirmedMissing: string | null = params.get('excludeConfirmedMissing');
        const durationType: string | null = params.get('durationType');
        const fromDate: string | null = params.get('fromDate');
        const toDate: string | null = params.get('toDate');

        if (stationIds.length === 0) {
          throw new Error('station ids must be selected');
        }
        if (durationType === null) {
          throw new Error('duration type must be selected');
        }

        if (fromDate === null) {
          throw new Error('from datee must be selected');
        }

        if (toDate === null) {
          throw new Error('from datee must be selected');
        }

        const newFilter: DataAvailabilityQueryModel = {
          stationIds: stationIds,
          durationType: DurationTypeEnum[durationType.toUpperCase() as keyof typeof DurationTypeEnum],
          fromDate: fromDate,
          toDate: toDate,
        };

        if (elementIds.length > 0) newFilter.elementIds = elementIds.map(Number);
        if (interval) newFilter.interval = Number(interval);
        if (level) newFilter.level = Number(level);
        if (excludeConfirmedMissing !== null) {
          newFilter.excludeConfirmedMissing = excludeConfirmedMissing.toString().toLowerCase() === 'true' ? true : false;
        }

        this.filter = newFilter;
      }

      // Get the climsoft time zone display setting
      this.cachedMetadataSearchService.allMetadataLoaded.pipe(
        takeUntil(this.destroy$),
      ).subscribe((allMetadataLoaded) => {
        if (!allMetadataLoaded) return;
        this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
        this.allStations = this.cachedMetadataSearchService.stationsMetadata;

        // If there is a filter then load data
        if (this.filter) this.onQueryClick(this.filter);

      });

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
    this.filter = newDataAvailabilityFilter;

    this.observationService.findDataAvailabilitySummary(this.filter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        this.stationsRendered = [];
        if (this.filter.stationIds && this.filter.stationIds.length > 0) {
          for (const station of this.allStations) {
            if (this.filter.stationIds.includes(station.id)) {
              this.stationsRendered.push(station);
            }
          }
        } else {
          this.stationsRendered = this.allStations;
        }
        this.heatMapStationValues = this.stationsRendered.map(item => `${item.id} - ${item.name}`);
        this.datesRendered = [];
        let dateToolTipPrefix: string; // Used by heat map chart (cell) tooltip for x-axis prefix 

        const fromDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.fromDate, this.utcOffset, 'add').split('T')[0];
        const toDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.toDate, this.utcOffset, 'add').split('T')[0];
        const [fromYear, fromMonth] = fromDate.split('-').map(Number);
        switch (this.filter.durationType) {
          case DurationTypeEnum.DAY:
            this.datesRendered = Array.from({ length: 24 }, (_, i) => i);
            this.heatMapDateValues = this.datesRendered.map(hour => {
              return `${StringUtils.addLeadingZero(hour)}`;
            });
            dateToolTipPrefix = 'Hour';
            break;
          case DurationTypeEnum.MONTH:
            const daysInMonth = new Date(fromYear, fromMonth, 0).getDate(); // day 0 of next month = last day of this month
            this.datesRendered = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            // Populate with "1-Wed", "2-Thu", etc.
            this.heatMapDateValues = this.datesRendered.map(day => {
              const date = new Date(fromYear, fromMonth - 1, day); // month is 0-based
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon", "Tue"
              return `${day}\n${weekday}`;
            });

            dateToolTipPrefix = 'Day';
            break;
          case DurationTypeEnum.YEAR:
            // 12 months of the year
            this.datesRendered = Array.from({ length: 12 }, (_, i) => i + 1);

            // Populate with "1-Jan", "2-Feb", etc.
            this.heatMapDateValues = this.datesRendered.map(month => {
              const date = new Date(2025, month - 1); // use any year, just to get month name
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });
              return `${month}\n${monthName}`;
            });

            dateToolTipPrefix = 'Month';
            break;
          case DurationTypeEnum.YEARS:
            this.datesRendered = [];
            const toYear: number = Number(toDate.split('-')[0]);

            // Years from and to selected years
            for (let yr: number = fromYear; yr <= toYear; yr++) {
              this.datesRendered.push(yr);
            }

            this.heatMapDateValues = this.datesRendered.map(String);
            dateToolTipPrefix = 'Year';
            break;
          default:
            throw new Error('Developer error. Duration type not supported');
        }


        // Chart data follows [x-index, y-index, value] format
        // [dateValueIndex, stationIndex,  value]
        const chartData: [number, number, number][] = [];
        let maxValue: number = 0
        for (const recordCountData of data) {
          const dateValueIndex = this.datesRendered.findIndex(dateValue => dateValue === recordCountData.dateValue);
          if (dateValueIndex === -1) {
            continue;
          }

          const stationIndex = this.stationsRendered.findIndex(station => station.id === recordCountData.stationId);
          if (stationIndex === -1) {
            continue;
          }

          chartData.push([dateValueIndex, stationIndex, recordCountData.recordCount]);

          if (recordCountData.recordCount > maxValue) {
            maxValue = recordCountData.recordCount;
          }
        }

        this.generateChart(this.heatMapDateValues, this.heatMapStationValues, chartData, maxValue, dateToolTipPrefix);
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Availability', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },
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
        splitArea: { show: true },
        triggerEvent: true, // Enable event triggering for xAxis labels
      },
      yAxis: {
        type: 'category',
        data: stations,
        splitArea: { show: true },
        triggerEvent: true, // Enable event triggering for yAxis labels
        axisLabel: {
          show: true,
          formatter: (value: string) => {
            // Optional: truncate long labels or wrap if necessary
            return value.length > 27 ? value.slice(0, 24) + '…' : value;
          },
          overflow: 'truncate', // could also try 'break', 'none', or 'breakAll'
        },
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
      // Create the dialg filter from the general filter then start overriding the parameters based on what has been clicked
      const detailsDialogFilter: DataAvailabilityQueryModel = { ...this.filter };
      let dateIndex: number;
      let stationIndex: number;
      let stationId: string;
      let dateValue: number
      switch (params.componentType) {
        case 'series':
          dateIndex = params.value[0];    // x-axis index (date)
          stationIndex = params.value[1]; // y-axis index (station) 
          stationId = this.stationsRendered[stationIndex].id;
          dateValue = this.datesRendered[dateIndex];

          // Overwrite the station ids and date to reflect the cell clicked station id and date value
          detailsDialogFilter.stationIds = [stationId];
          this.changeDatesBasedOnClickedHeatMapParam(detailsDialogFilter, dateValue);
          break;
        case 'xAxis':
          dateIndex = this.heatMapDateValues.indexOf(params.value)
          dateValue = this.datesRendered[dateIndex];

          // Overwrite the date to reflect the x-axis clicked date value
          this.changeDatesBasedOnClickedHeatMapParam(detailsDialogFilter, dateValue);
          break;
        case 'yAxis':
          stationIndex = this.heatMapStationValues.indexOf(params.value)
          stationId = this.stationsRendered[stationIndex].id;

          // Overwrite the station id to reflect the y-axis station
          detailsDialogFilter.stationIds = [stationId];
          break;
        default:
          // Any other click events are not supported. So just return
          return;
      }

      // Show the dialog 
      this.dataAvailabilityOptionsDialogComponent.showDialog(detailsDialogFilter);
    });


  }

  /**
   * Changes the date values of the passed filter based on the duration type of the filter
   * @param detailsDialogFilter 
   * @param dateValue 
   */
  private changeDatesBasedOnClickedHeatMapParam(detailsDialogFilter: DataAvailabilityQueryModel, dateValue: number): void {
    // Dates shown on the heatmap are based on utcOffset timezone(e.g to reflect the local timezone) set while dates on the filter are on UTC timezone.
    // So add the utcoffset to get the dates in local timezones first before making adjustments to the from and to date
    let fromDate: Date = new Date(DateUtils.getDatetimesBasedOnUTCOffset(detailsDialogFilter.fromDate, this.utcOffset, 'add'));
    let toDate: Date = new Date(DateUtils.getDatetimesBasedOnUTCOffset(detailsDialogFilter.toDate, this.utcOffset, 'add'));

    switch (this.filter.durationType) {
      case DurationTypeEnum.DAY:
        fromDate.setUTCHours(dateValue);
        toDate.setUTCHours(dateValue);
        break;
      case DurationTypeEnum.MONTH:
        console.log('dateValue from ', dateValue)
        console.log('before from ', fromDate)
        console.log('before from ', fromDate)
        fromDate.setUTCDate(dateValue);
        toDate.setUTCDate(dateValue);
        console.log('after from ', fromDate)
        console.log('after to ', toDate)
        break;
      case DurationTypeEnum.YEAR:
        fromDate.setUTCMonth(dateValue - 1);
        toDate.setUTCMonth(dateValue - 1);
        break;
      case DurationTypeEnum.YEARS:
        fromDate.setUTCFullYear(dateValue);
        toDate.setUTCFullYear(dateValue);
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

    // cheange the from and to date to UTC timezone as required by the API 
    detailsDialogFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.utcOffset, 'subtract');
    detailsDialogFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.utcOffset, 'subtract');
  }

}
