import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DataAvailabilitySummaryQueryModel } from '../models/data-availability-summary-query.model';
import { DataAvailabilityOptionsDialogComponent } from '../data-availability-options-dialog/data-availability-options-dialog.component';
import { DurationTypeEnum } from '../models/duration-type.enum';

@Component({
  selector: 'app-data-availability-summary',
  templateUrl: './data-availability-summary.component.html',
  styleUrls: ['./data-availability-summary.component.scss']
})
export class DataAvailabilitySummaryComponent implements OnChanges, OnDestroy {
  @ViewChild('appDataAvailabilityOptionsDialog')
  private dataAvailabilityOptionsDialogComponent!: DataAvailabilityOptionsDialogComponent;

  @Input()
  public filter!: DataAvailabilitySummaryQueryModel;


  public enableQueryButton: boolean = true;

  @Output()
  public enableQueryButtonChange = new EventEmitter<boolean>();

  @Output()
  public filterChange = new EventEmitter<DataAvailabilitySummaryQueryModel>();

  private stationsRendered!: StationCacheModel[];
  private datesRendered!: number[];
  private chartInstance!: echarts.ECharts;
  private heatMapDateValues!: string[]; // Used by heatmap chart to show labels in the x-axis
  private heatMapStationValues!: string[];// Used by heatmap chart to show labels in the y-axis

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataService: CachedMetadataService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) {

      this.loadSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  protected onQueryClick(newSummaryFilter: DataAvailabilitySummaryQueryModel): void {
    this.filter = newSummaryFilter;
    this.loadSummary();
    this.filterChange.emit(this.filter);
  }

  private loadSummary(): void {
    console.log('loading summary for: ', this.filter);
    this.enableQueryButton = false;
    this.observationService.findDataAvailabilitySummary(this.filter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        console.log('summary data: ', data);
        this.enableQueryButton = true;
        this.stationsRendered = [];
        if (this.filter.stationIds && this.filter.stationIds.length > 0) {
          for (const station of this.cachedMetadataService.stationsMetadata) {
            if (this.filter.stationIds.includes(station.id)) {
              this.stationsRendered.push(station);
            }
          }
        } else {
          this.stationsRendered = [...this.cachedMetadataService.stationsMetadata];
        }
        this.heatMapStationValues = this.stationsRendered.map(item => `${item.id} - ${item.name}`);
        this.datesRendered = [];
        let dateToolTipPrefix: string; // Used by heat map chart (cell) tooltip for x-axis prefix 

        const fromDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
        const toDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.toDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
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
        this.enableQueryButton = true;
        this.pagesDataService.showToast({ title: 'Data Availability', message: err, type: ToastEventTypeEnum.ERROR });
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
      const detailsDialogFilter: DataAvailabilitySummaryQueryModel = { ...this.filter };
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
          this.changeDurationTypeNDatesBasedOnClickedHeatMapParam(detailsDialogFilter, dateValue);
          break;
        case 'xAxis':
          dateIndex = this.heatMapDateValues.indexOf(params.value)
          dateValue = this.datesRendered[dateIndex];

          // Overwrite the date to reflect the x-axis clicked date value
          this.changeDurationTypeNDatesBasedOnClickedHeatMapParam(detailsDialogFilter, dateValue);
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

      //console.log('detailsDialogFilter: ', detailsDialogFilter);

      // Show the dialog 
      this.dataAvailabilityOptionsDialogComponent.showDialog(detailsDialogFilter, this.filter.durationType === DurationTypeEnum.DAY);
    });


  }

  /**
   * Changes the duratiom type to reflect the drill down of the dates
   * Changes the date values of the passed filter based on the duration type of the filter
   * @param filter 
   * @param dateValue 
   */
  private changeDurationTypeNDatesBasedOnClickedHeatMapParam(filter: DataAvailabilitySummaryQueryModel, dateValue: number): void {
    // Dates shown on the heatmap are based on utcOffset timezone(e.g to reflect the local timezone) set while dates on the filter are on UTC timezone.
    // So add the utcoffset to get the dates in local timezones first before making adjustments to the from and to date
    let fromDate: Date = new Date(DateUtils.getDatetimesBasedOnUTCOffset(filter.fromDate, this.cachedMetadataService.utcOffSet, 'add'));
    let toDate: Date = new Date(DateUtils.getDatetimesBasedOnUTCOffset(filter.toDate, this.cachedMetadataService.utcOffSet, 'add'));

    switch (this.filter.durationType) {
      case DurationTypeEnum.DAY:
        fromDate.setUTCHours(dateValue);
        toDate.setUTCHours(dateValue);
        break;
      case DurationTypeEnum.MONTH:
        fromDate.setUTCDate(dateValue);
        toDate.setUTCDate(dateValue);
        filter.durationType = DurationTypeEnum.DAY;
        break;
      case DurationTypeEnum.YEAR:
        fromDate.setUTCMonth(dateValue - 1);
        toDate.setUTCMonth(dateValue - 1);
        filter.durationType = DurationTypeEnum.MONTH;
        break;
      case DurationTypeEnum.YEARS:
        fromDate.setUTCFullYear(dateValue);
        toDate.setUTCFullYear(dateValue);
        filter.durationType = DurationTypeEnum.YEAR;
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

    // change the from and to date to UTC timezone as required by the API 
    filter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
    filter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
  }

}
