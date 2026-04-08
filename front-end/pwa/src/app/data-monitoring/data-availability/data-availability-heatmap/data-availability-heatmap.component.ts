import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { take } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DataAvailabilitySummaryQueryModel } from '../models/data-availability-summary-query.model';
import { DurationTypeEnum } from '../models/duration-type.enum';

export interface DataAvailabilityCellClickEvent {
    derivedFilter: DataAvailabilitySummaryQueryModel;
    hideDrillDown: boolean;
}

@Component({
    selector: 'app-data-availability-heatmap',
    templateUrl: './data-availability-heatmap.component.html',
    styleUrls: ['./data-availability-heatmap.component.scss']
})
export class DataAvailabilityHeatmapComponent implements OnDestroy {
    @ViewChild('chartContainer') private chartContainer!: ElementRef;

    @Output() public loadingChange = new EventEmitter<boolean>();
    @Output() public cellClick = new EventEmitter<DataAvailabilityCellClickEvent>();

    private filter!: DataAvailabilitySummaryQueryModel;
    private stationsPermitted: StationCacheModel[] = [];
    private stationsRendered!: StationCacheModel[];
    private datesRendered!: number[];
    private chartInstance!: echarts.ECharts;
    private heatMapDateValues!: string[];
    private heatMapStationValues!: string[];
    protected loading: boolean = false;

    constructor(
        private pagesDataService: PagesDataService,
        private observationService: ObservationsService,
        private cachedMetadataService: CachedMetadataService,
    ) { }

    ngOnDestroy(): void {
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
    }

    public executeQuery(filter: DataAvailabilitySummaryQueryModel, stationsPermitted: StationCacheModel[]): void {
        this.filter = filter;
        this.stationsPermitted = stationsPermitted;
        this.loadSummary();
    }

    public resize(): void {
        if (this.chartInstance) {
            this.chartInstance.resize();
        }
    }

    private loadSummary(): void {
        this.loading = true;
        this.loadingChange.emit(true);
        this.observationService.findDataAvailabilitySummary(this.filter).pipe(
            take(1)
        ).subscribe({
            next: data => {
                this.loading = false;
                this.loadingChange.emit(false);
                this.stationsRendered = [];
                if (this.filter.stationIds && this.filter.stationIds.length > 0) {
                    for (const station of this.stationsPermitted) {
                        if (this.filter.stationIds.includes(station.id)) {
                            this.stationsRendered.push(station);
                        }
                    }
                } else {
                    this.stationsRendered = [...this.stationsPermitted];
                }
                this.heatMapStationValues = this.stationsRendered.map(item => `${item.id} - ${item.name}`);
                this.datesRendered = [];
                let dateToolTipPrefix: string;

                const fromDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
                const toDate: string = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.toDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
                const [fromYear, fromMonth] = fromDate.split('-').map(Number);

                switch (this.filter.durationType) {
                    case DurationTypeEnum.DAY:
                        this.datesRendered = Array.from({ length: 24 }, (_, i) => i);
                        this.heatMapDateValues = this.datesRendered.map(hour => StringUtils.addLeadingZero(hour));
                        dateToolTipPrefix = 'Hour';
                        break;
                    case DurationTypeEnum.MONTH: {
                        const daysInMonth = new Date(fromYear, fromMonth, 0).getDate();
                        this.datesRendered = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                        this.heatMapDateValues = this.datesRendered.map(day => {
                            const date = new Date(fromYear, fromMonth - 1, day);
                            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
                            return `${day}\n${weekday}`;
                        });
                        dateToolTipPrefix = 'Day';
                        break;
                    }
                    case DurationTypeEnum.YEAR:
                        this.datesRendered = Array.from({ length: 12 }, (_, i) => i + 1);
                        this.heatMapDateValues = this.datesRendered.map(month => {
                            const date = new Date(2025, month - 1);
                            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                            return `${month}\n${monthName}`;
                        });
                        dateToolTipPrefix = 'Month';
                        break;
                    case DurationTypeEnum.YEARS: {
                        const toYear: number = Number(toDate.split('-')[0]);
                        for (let yr: number = fromYear; yr <= toYear; yr++) {
                            this.datesRendered.push(yr);
                        }
                        this.heatMapDateValues = this.datesRendered.map(String);
                        dateToolTipPrefix = 'Year';
                        break;
                    }
                    default:
                        throw new Error('Developer error. Duration type not supported');
                }

                const chartData: [number, number, number][] = [];
                let maxValue = 0;
                for (const recordCountData of data) {
                    const dateValueIndex = this.datesRendered.findIndex(dateValue => dateValue === recordCountData.dateValue);
                    if (dateValueIndex === -1) continue;
                    const stationIndex = this.stationsRendered.findIndex(station => station.id === recordCountData.stationId);
                    if (stationIndex === -1) continue;
                    chartData.push([dateValueIndex, stationIndex, recordCountData.recordCount]);
                    if (recordCountData.recordCount > maxValue) maxValue = recordCountData.recordCount;
                }

                this.generateChart(this.heatMapDateValues, this.heatMapStationValues, chartData, maxValue, dateToolTipPrefix);
            },
            error: err => {
                this.loading = false;
                this.loadingChange.emit(false);
                this.pagesDataService.showToast({ title: 'Data Availability', message: err, type: ToastEventTypeEnum.ERROR });
            },
        });
    }

    private generateChart(dateValues: string[], stations: string[], data: [number, number, number][], maxValue: number, dateToolTipPrefix: string): void {
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }

        this.chartInstance = echarts.init(this.chartContainer.nativeElement);

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
            grid: { height: '80%', top: 50, left: 200, right: 70 },
            xAxis: {
                type: 'category',
                data: dateValues,
                splitArea: { show: true },
                triggerEvent: true,
            },
            yAxis: {
                type: 'category',
                data: stations,
                splitArea: { show: true },
                triggerEvent: true,
                axisLabel: {
                    show: true,
                    formatter: (value: string) => value.length > 27 ? value.slice(0, 24) + '…' : value,
                    overflow: 'truncate',
                },
            },
            dataZoom: [
                { type: 'slider', xAxisIndex: 0, orient: 'horizontal', bottom: 15, height: 30, left: 200, right: 50 },
                { type: 'inside', xAxisIndex: 0 },
                { type: 'slider', yAxisIndex: 0, orient: 'vertical', right: 10, top: 50, width: 30, height: '80%' },
                { type: 'inside', yAxisIndex: 0 },
            ],
            visualMap: {
                min: 0,
                max: maxValue,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                top: 0,
                itemWidth: 20,
                itemHeight: 300,
                inRange: {
                    color: ['#ffffe0', '#ffff99', '#ccff66', '#99ff33', '#66cc00', '#339900', '#006600'],
                },
            },
            series: [{
                name: 'Data Availability',
                type: 'heatmap',
                data: data,
                label: { show: true },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }],
        };

        this.chartInstance.setOption(chartOptions);

        this.chartInstance.off('click');
        this.chartInstance.on('click', (params: any) => {
            const derivedFilter: DataAvailabilitySummaryQueryModel = { ...this.filter };
            let dateIndex: number;
            let stationIndex: number;

            switch (params.componentType) {
                case 'series':
                    dateIndex = params.value[0];
                    stationIndex = params.value[1];
                    derivedFilter.stationIds = [this.stationsRendered[stationIndex].id];
                    this.changeDurationTypeAndDates(derivedFilter, this.datesRendered[dateIndex]);
                    break;
                case 'xAxis':
                    dateIndex = this.heatMapDateValues.indexOf(params.value);
                    this.changeDurationTypeAndDates(derivedFilter, this.datesRendered[dateIndex]);
                    break;
                case 'yAxis':
                    stationIndex = this.heatMapStationValues.indexOf(params.value);
                    derivedFilter.stationIds = [this.stationsRendered[stationIndex].id];
                    break;
                default:
                    return;
            }

            this.cellClick.emit({
                derivedFilter,
                hideDrillDown: this.filter.durationType === DurationTypeEnum.DAY,
            });
        });
    }

    private changeDurationTypeAndDates(filter: DataAvailabilitySummaryQueryModel, dateValue: number): void {
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

        filter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
        filter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
    }
}
