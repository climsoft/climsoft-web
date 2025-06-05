import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { interval, Subject, take, takeUntil } from 'rxjs';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { DataFlowQueryModel } from 'src/app/data-ingestion/models/data-flow-query.model';

interface DataFlowView {
  stationId: string
  stationName: string;
  value: number | null;
  flag: string | null;
  datetime: string;
  //formattedDatetime: string; 
}

@Component({
  selector: 'app-data-flow',
  templateUrl: './data-flow.component.html',
  styleUrls: ['./data-flow.component.scss']
})
export class DataFlowComponent implements OnDestroy {
  private query!: DataFlowQueryModel;
  private stationsMetadata!: StationCacheModel[];
  protected enableQueryButton: boolean = true;
  private utcOffset: number = 0;
  private chartInstance!: echarts.ECharts;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private observationService: ObservationsService,
    private generalSettingsService: GeneralSettingsService,
  ) {
    this.pagesDataService.setPageHeader('Data Flow');

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.stationsMetadata = data;
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

  protected onQueryClick(query: DataFlowQueryModel): void {
    this.query = query;
    this.enableQueryButton = false;
    this.observationService.findDataFlow(query).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        const stationIds: string[] = [];
        const observationViews: DataFlowView[] = data.map(observation => {

          const stationMetadata = this.stationsMetadata.find(item => item.id === observation.stationId);
          if (!stationMetadata) {
            throw new Error("Developer error: Station not found.");
          }


          if (!stationIds.includes(observation.stationId)) stationIds.push(observation.stationId)

          const obsView: DataFlowView = {
            stationId: observation.stationId,
            stationName: stationMetadata.name,
            value: observation.value,
            flag: observation.flag,
            datetime: observation.datetime,// TODO adjust to display time
          }
          return obsView;

        });

        //console.log('station ids: ', stationIds);

        this.generateChart(observationViews);
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Flow', message: err, type: ToastEventTypeEnum.ERROR });
        this.enableQueryButton = true;
      },
    });
  }

  private generateChart(dataFlowData: DataFlowView[]): void {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }

    this.chartInstance = echarts.init(document.getElementById('dataFlowMonitoringChart'));

    if (dataFlowData.length == 0) {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'No data', type: ToastEventTypeEnum.INFO });
      return;
    };

    // Step 1: Group observations by station
    const stationGroups = new Map<string, DataFlowView[]>();
    for (const obs of dataFlowData) {
      const group: DataFlowView[] | undefined = stationGroups.get(obs.stationId);
      if (group) {
        group.push(obs);
      } else {
        stationGroups.set(obs.stationId, [obs]);
      }
    }

    // Step 2: Get global time range
    const allTimestamps: number[] = dataFlowData.map(o => new Date(o.datetime).getTime());
    const start: number = Math.min(...allTimestamps);
    const end: number = Math.max(...allTimestamps);
    // Interval is always in minutes, so convert to milliseconds
    const intervalMilliseconds: number = this.query.interval * 60 * 1000;

    // Step 3: Create full timeline
    const timeline: number[] = [];
    for (let t = start; t <= end; t += intervalMilliseconds) {
      timeline.push(t);
    }


    // Step 4: Prepare series data for each station
    const series = Array.from(stationGroups.entries()).map(([stationId, records]) => {
      const name = `${stationId} - ${records[0].stationName}`;

      const valueMap = new Map<number, number | null>();
      for (const r of records) {
        valueMap.set(new Date(r.datetime).getTime(), r.value);
      }

      const data: [number, number | null][] = timeline.map(t => [t, valueMap.get(t) ?? null]);
      const showSymbols = data.length < 200;  // show symbols for small datasets

      return {
        name: name,
        type: 'line',
        data: data,
        connectNulls: false,
        showSymbol: showSymbols,
        symbolSize: 8,
        smooth: false,
        lineStyle: { width: 2 }
      };
    });


    // Step 5: Set up chart
    const chartOptions = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const lines = params.map((p: any) => {
            const value = p.data[1] !== null ? p.data[1] : '<i>Missing</i>';
            return `${p.marker} ${p.seriesName}: ${value}`;
          });
          const formattedDatetime = new Date(params[0].data[0]).toISOString().replace('T', ' ').replace('Z', '');
          return `${formattedDatetime}<br/>${lines.join('<br/>')}`;
        }
      },
      grid: {
        left: 300,
        right: 70,
        bottom: 100
      },

      xAxis: {
        type: 'time',
        name: 'Datetime',
        nameLocation: 'middle',
        nameGap: 25
      },
      yAxis: {
        type: 'value',
        name: 'Value',
        nameLocation: 'middle',
        nameGap: 35
      },
      legend: {
        type: 'scroll',
        top: 50,
        orient: 'vertical',
        left: 10,
        bottom: 50,
        formatter: (name: string) => {
          const maxLineLength = 27; // characters per line
          const lines = [];

          for (let i = 0; i < name.length; i += maxLineLength) {
            lines.push(name.substring(i, i + maxLineLength));
          }

          return lines.join('\n'); // insert line breaks
        },
        textStyle: {
          width: 250, // restrict the width (optional, visual aid)
          overflow: 'break',
        }
      }
      ,
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: 0,
          bottom: 15,
          height: 30
        },
        {
          type: 'inside',
          xAxisIndex: 0
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          right: 10,
          width: 30
        },
        {
          type: 'inside',
          yAxisIndex: 0
        }
      ]
      ,
      series: series,

    };

    this.chartInstance.setOption(chartOptions);

    this.chartInstance.off('click'); // remove any previous handler to avoid duplicates
    this.chartInstance.on('click', (params: any) => {
      if (params.componentType === 'series') {
        const clickedTimestamp = new Date(params.data[0]).toISOString();
        const clickedValue = params.data[1];
        const stationSeries = params.seriesName;

        //console.log('Clicked Point: ', { stationSeries, clickedTimestamp, clickedValue  });

        // Example: Show a toast or navigate, filter etc.
        this.pagesDataService.showToast({
          title: 'Chart Click',
          message: `Station: ${stationSeries}\nDatetime: ${clickedTimestamp}\nValue: ${clickedValue}`,
          type: ToastEventTypeEnum.INFO
        });
      }

      console.log(`Clicked params: `, params);

    });


  }




}
