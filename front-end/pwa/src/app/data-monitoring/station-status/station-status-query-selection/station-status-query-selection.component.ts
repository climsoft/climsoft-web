import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationStatusQueryModel } from '../models/station-status-query.model';

@Component({
  selector: 'app-station-status-query-selection',
  templateUrl: './station-status-query-selection.component.html',
  styleUrls: ['./station-status-query-selection.component.scss']
})
export class StationStatusQuerySelectionComponent implements OnDestroy {
  @Input() public enableQueryButton: boolean = true;
  @Output() public queryClick = new EventEmitter<StationStatusQueryModel>()

  protected stationIds: string[] = [];
  protected elementId: number = 0;
  protected duration: number = 3;
  protected durationType: 'hours' | 'days' = 'hours';
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
  ) {
    this.setStationsAllowed();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setStationsAllowed(): void {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.includeOnlyStationIds = [];
        return;
      }

      if (!user.permissions) {
        this.queryAllowed = false;
        throw new Error('Developer error. Permissions NOT set.');
      }

      const permissions: UserPermissionModel = user.permissions;
      if (permissions.ingestionMonitoringPermissions) {
        this.includeOnlyStationIds = permissions.ingestionMonitoringPermissions.stationIds ? permissions.ingestionMonitoringPermissions.stationIds : [];
      } else {
        this.queryAllowed = false;
      }
    });
  }

  protected onDurationChange(durationOption: string) {
    this.durationType = durationOption === 'Hours' ? 'hours' : 'days';
  }

  protected onQueryClick(): void {
    if (this.duration <= 0) {
      this.pagesDataService.showToast({ title: 'Stations  Status', message: 'Duration must be greater than 0', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const observationFilter: StationStatusQueryModel = {
      duration: this.duration,
      durationType: this.durationType
    };;

    // Get the data based on the selection filter

    if (this.stationIds.length > 0) {
      observationFilter.stationIds = this.stationIds;
    }

    if (this.elementId > 0) {
      observationFilter.elementId = this.elementId;
    }

    this.queryClick.emit(observationFilter);
  }


}
