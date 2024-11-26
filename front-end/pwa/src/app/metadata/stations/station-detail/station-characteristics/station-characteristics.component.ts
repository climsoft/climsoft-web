import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent implements OnChanges, OnDestroy {
  @Input()
  public stationId!: string;

  protected station!: StationCacheModel;

  private destroy$ = new Subject<void>();

  constructor(private stationsCacheService: StationsCacheService) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.stationId) {
      this.stationsCacheService.findOne(this.stationId).pipe(
        takeUntil(this.destroy$),
      ).subscribe((data) => {
        if (data) {
          this.station = data;
        }
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
