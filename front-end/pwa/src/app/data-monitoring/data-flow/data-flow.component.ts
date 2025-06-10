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


  private generateChartHeatmap(dataFlowData: DataFlowView[]): void {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }

    this.chartInstance = echarts.init(document.getElementById('dataFlowMonitoringChart'));

    if (dataFlowData.length === 0) {
      this.pagesDataService.showToast({
        title: 'Data Flow',
        message: 'No data',
        type: ToastEventTypeEnum.INFO
      });
      return;
    }

    // Step 1: Group observations by station
    const stationGroups = new Map<string, DataFlowView[]>();
    for (const obs of dataFlowData) {
      if (!stationGroups.has(obs.stationId)) {
        stationGroups.set(obs.stationId, []);
      }
      stationGroups.get(obs.stationId)?.push(obs);
    }

    // Step 2: Get global time range
    const allTimestamps = dataFlowData.map(o => new Date(o.datetime).getTime());
    const start = Math.min(...allTimestamps);
    const end = Math.max(...allTimestamps);
    const intervalMilliseconds = this.query.interval * 60 * 1000;

    // Step 3: Create full timeline
    const timeline: number[] = [];
    for (let t = start; t <= end; t += intervalMilliseconds) {
      timeline.push(t);
    }
    const timeLabels = timeline.map(t =>
      new Date(t).toISOString().slice(0, 16).replace('T', ' ')
    );

    // Step 4: Prepare station labels
    const stationIdToLabel = new Map<string, string>();
    for (const [stationId, records] of stationGroups.entries()) {
      const stationName = records[0].stationName;
      stationIdToLabel.set(stationId, `${stationId} - ${stationName}`);
    }
    const stationIds = Array.from(stationGroups.keys());
    const stationLabels = stationIds.map(id => stationIdToLabel.get(id)!);

    // Step 5: Build heatmap data [xIndex, yIndex, value]
    const heatmapData: [number, number, number | null][] = [];

    stationIds.forEach((stationId, yIndex) => {
      const records = stationGroups.get(stationId)!;
      const valueMap = new Map<number, number | null>();
      records.forEach(r => valueMap.set(new Date(r.datetime).getTime(), r.value));

      timeline.forEach((t, xIndex) => {
        const value = valueMap.get(t) ?? null;
        heatmapData.push([xIndex, yIndex, value]);
      });
    });

    // Step 6: Create heatmap chart
    const chartOptions = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const time = timeLabels[params.data[0]];
          const station = stationLabels[params.data[1]];
          const value = params.data[2] !== null ? params.data[2] : '<i>Missing</i>';
          return `${station}<br/>${time}: ${value}`;
        }
      },
      grid: {
        left: 300,
        right: 50,
        bottom: 100,
        top: 60
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        name: 'Datetime',
        nameLocation: 'middle',
        nameGap: 25,
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: stationLabels,
        name: 'Station',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          fontSize: 10,
          formatter: (name: string) => {
            const maxLength = 30;
            const lines = [];
            for (let i = 0; i < name.length; i += maxLength) {
              lines.push(name.substring(i, i + maxLength));
            }
            return lines.join('\n');
          }
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 20,
        // inRange: {
        //   color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
        // },
        // outOfRange: {
        //   color: ['#cccccc']  // for missing/null
        // }
      },
      series: [
        {
          name: 'Observations',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              borderColor: '#333',
              borderWidth: 1
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 30,
          bottom: 40
        },
        {
          type: 'inside',
          xAxisIndex: 0
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          width: 12,
          right: 10
        },
        {
          type: 'inside',
          yAxisIndex: 0
        }
      ],

    };

    this.chartInstance.setOption(chartOptions);

    this.chartInstance.off('click');
    this.chartInstance.on('click', (params: any) => {
      const time = timeLabels[params.data[0]];
      const station = stationLabels[params.data[1]];
      const value = params.data[2] !== null ? params.data[2] : 'Missing';

      this.pagesDataService.showToast({
        title: 'Data Point',
        message: `Station: ${station}\nDatetime: ${time}\nValue: ${value}`,
        type: ToastEventTypeEnum.INFO
      });
    });
  }


}
