import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/interval-single-input/Intervals.util';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationsService } from '../../services/observations.service';

import * as echarts from 'echarts';
import { CreateObservationModel } from '../../models/create-observation.model';

interface Observation {
  obsDef: CreateObservationModel;
  stationName: string;
  elementAbbrv: string;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-data-flow',
  templateUrl: './data-flow.component.html',
  styleUrls: ['./data-flow.component.scss']
})
export class DataFlowComponent implements AfterViewInit, OnDestroy {
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
    this.generalSettingsService.findOne(2).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(document.getElementById('dataFlowMonitoringChart')!);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    this.enableQueryButton = false;
    observationFilter.page = 1
    observationFilter.pageSize = 1000;
    this.observationService.findProcessed(observationFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {

        const observationViews: Observation[] = data.map(observation => {

          const stationMetadata = this.stationsMetadata.find(item => item.id === observation.stationId);
          if (!stationMetadata) {
            throw new Error("Developer error: Station not found.");
          }

          const elementMetadata = this.elementsMetadata.find(item => item.id === observation.elementId);
          if (!elementMetadata) {
            throw new Error("Developer error: Element not found.");
          }

          const sourceMetadata = this.sourcesMetadata.find(item => item.id === observation.sourceId);
          if (!sourceMetadata) {
            throw new Error("Developer error: Source not found.");
          }

          const obsView: Observation = {
            obsDef: observation,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            sourceName: sourceMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(observation.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(observation.interval)
          }
          return obsView;

        });

        this.generateChart(observationViews);
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


  private generateChart1(observations: Observation[]) {
    if (observations.length == 0) {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'No data', type: ToastEventTypeEnum.INFO });
      this.chartInstance.setOption({});
      return;
    };

    const intervalMinutes = observations[0].obsDef.interval;
    const intervalMs = intervalMinutes * 60 * 1000;

    const dataMap = new Map<number, number | null>(
      observations.map(obs => [new Date(obs.obsDef.datetime).getTime(), obs.obsDef.value])
    );

    const start = new Date(observations[0].obsDef.datetime).getTime();
    const end = new Date(observations[observations.length - 1].obsDef.datetime).getTime();

    const fullTimeline: [number, number | null][] = [];
    for (let t = start; t <= end; t += intervalMs) {
      fullTimeline.push([t, dataMap.has(t) ? dataMap.get(t)! : null]);
    }

    const chartOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const [point] = params;
          //const formattedDatetime = new Date(point.data[0]).toLocaleString();
          const formattedDatetime = DateUtils.getPresentableDatetime(new Date(point.data[0]).toISOString(), this.utcOffset);
          return point.data[1] !== null
            ? `${formattedDatetime}<br/>Value: ${point.data[1]}`
            : `${formattedDatetime}<br/><i>Missing</i>`;
        }
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
      series: [{
        type: 'line',
        name: 'Raw Data',
        data: fullTimeline,
        connectNulls: false,  // important: gaps will be shown
        showSymbol: false,
        smooth: false,        // important: no curve smoothing
        lineStyle: {
          width: 2
        }
      }],
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%'
      }
    };

    this.chartInstance.setOption(chartOption);
  }

  private generateChart(observations: Observation[]) {
    if (observations.length == 0) {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'No data', type: ToastEventTypeEnum.INFO });
      this.chartInstance.setOption({});
      return;
    };

    const intervalMinutes = observations[0].obsDef.interval;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Step 1: Group observations by station
    const stationGroups = new Map<string, Observation[]>();
    for (const obs of observations) {
      if (!stationGroups.has(obs.obsDef.stationId)) {
        stationGroups.set(obs.obsDef.stationId, []);
      }
      stationGroups.get(obs.obsDef.stationId)!.push(obs);
    }

    // Step 2: Get global time range
    const allTimestamps = observations.map(o => new Date(o.obsDef.datetime).getTime());
    const start = Math.min(...allTimestamps);
    const end = Math.max(...allTimestamps);

    // Step 3: Create full timeline
    const timeline: number[] = [];
    for (let t = start; t <= end; t += intervalMs) {
      timeline.push(t);
    }

    // Step 4: Prepare series data for each station
    const series = Array.from(stationGroups.entries()).map(([stationId, records]) => {
      const name = `${stationId} - ${records[0].stationName}`;

      const valueMap = new Map<number, number | null>();
      for (const r of records) {
        valueMap.set(new Date(r.obsDef.datetime).getTime(), r.obsDef.value);
      }

      const data: [number, number | null][] = timeline.map(t => [t, valueMap.get(t) ?? null]);

      return {
        name,
        type: 'line',
        data,
        connectNulls: false,
        showSymbol: false,
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
          const formattedDatetime = DateUtils.getPresentableDatetime(new Date(params[0].data[0]).toISOString(), this.utcOffset);
          return `${formattedDatetime}<br/>${lines.join('<br/>')}`;
        }
      },
      legend: {
        type: 'scroll',
        top: 10
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
      series,
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%'
      }
    };

    this.chartInstance.setOption(chartOptions);

  }




}
