import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel } from '../../services/stations-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent implements OnChanges {
  @Input()
  public station!: StationCacheModel;

  protected userCanEditStation: boolean = false;

  constructor(private appAuthService: AppAuthService,) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.station) {
      // Check on allowed options
      this.appAuthService.user.pipe(
        take(1),
      ).subscribe(user => {
        if (!user) {
          throw new Error('User not logged in');
        }

        if (user.isSystemAdmin) {
          this.userCanEditStation = true;
        } else if (user.permissions && user.permissions.stationsMetadataPermissions) {
          const stationIds = user.permissions.stationsMetadataPermissions.stationIds;
          if (stationIds) {
            this.userCanEditStation = stationIds.includes(this.station.id)
          } else {
            this.userCanEditStation = true;
          }
        } else {
          this.userCanEditStation = false;
        }
      });
    }
  }


}
