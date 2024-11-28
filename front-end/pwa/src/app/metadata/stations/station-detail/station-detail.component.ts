import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { StationCacheModel, StationsCacheService } from '../services/stations-cache.service';

@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit, OnDestroy {
  protected station!: StationCacheModel;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private location: Location,
    private route: ActivatedRoute,
    private stationsCacheService: StationsCacheService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {
    const stationId = this.route.snapshot.params['id'];
    this.stationsCacheService.findOne(stationId).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      if (data) {
        this.station = data;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get isManualorHybridStation(): boolean {
    return this.station.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || this.station.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
  }

  protected onDelete(): void {
    // TODO. Show an 'are you sure dialog'.
    this.stationsCacheService.delete(this.station.id).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: "Station Deleted", message: `Station ${this.station.id} deleted`, type: "success" });
        this.location.back();
      }
    });

  }



}
