import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-view-stations-table',
  templateUrl: './view-stations-table.component.html',
  styleUrls: ['./view-stations-table.component.scss']
})
export class ViewStationsTableComponent implements OnChanges {
  @Input()
  public stations!: StationCacheModel[];

  protected showEditButton: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appAuthService: AppAuthService,) { }

  ngOnChanges(changes: SimpleChanges): void {
     if (this.stations) {
          // Check on allowed options
          this.appAuthService.user.pipe(
            take(1),
          ).subscribe(user => {
            if (!user) {
              throw new Error('User not logged in');
            }
    
            // Only show edit button if user is admin
            // However, other users allowed to edit a station can always click on it.
            if (user.isSystemAdmin) {
              this.showEditButton = true;
            }
          });
        }
  }

  protected onStationClicked(station: StationCacheModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  protected onEditStationClicked(station: StationCacheModel) {
  }

}
