import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DataAvailaibilityDetails } from '../models/data-availability-details.model';
import { DataAvailabilityQueryModel, DurationTypeEnum } from '../models/data-availability-query.model';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-data-availability-details-dialog',
  templateUrl: './data-availability-details-dialog.component.html',
  styleUrls: ['./data-availability-details-dialog.component.scss']
})
export class DataAvailabilityDetailsDialogComponent implements OnDestroy {
  protected detailsAvailabilityFilter!: DataAvailabilityQueryModel;
  protected durationTypeEnum: typeof DurationTypeEnum = DurationTypeEnum; // used by the template
  protected open: boolean = false;

  protected availabilityDetails!: DataAvailaibilityDetails[];
  private user!: LoggedInUserModel;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private router: Router,
  ) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public showDialog(detailsDialogFilter: DataAvailabilityQueryModel): void {
    this.detailsAvailabilityFilter = detailsDialogFilter;
    this.open = true;

    // Load gap analysis
  }

  protected drillDown(): void {
    const filter: DataAvailabilityQueryModel = { ...this.detailsAvailabilityFilter };
    switch (filter.durationType) {
      case DurationTypeEnum.DAY:
        throw new Error('Developer error. Drill down not supported for day duration type');
      case DurationTypeEnum.MONTH:
        filter.durationType = DurationTypeEnum.DAY;
        break;
      case DurationTypeEnum.YEAR:
        filter.durationType = DurationTypeEnum.MONTH;
        break;
      case DurationTypeEnum.YEARS:
        filter.durationType = DurationTypeEnum.YEAR;
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

    const serialisedUrl = this.router.serializeUrl(
      this.router.createUrlTree(['/data-monitoring/data-availability'], { queryParams: filter })
    );

    window.open(serialisedUrl, '_blank');
    this.open = false;
  }

  protected viewData(): void {
    // Important to note the view filter has no exclude missing so the number of records shown in data correction or explorer
    // may differ from what is hsown in data availability. They should always be the same when missing values are not excluded.
    const viewFilter: ViewObservationQueryModel = {
      stationIds: this.detailsAvailabilityFilter.stationIds,
      fromDate: this.detailsAvailabilityFilter.fromDate,
      toDate: this.detailsAvailabilityFilter.toDate,
    };

    if (this.detailsAvailabilityFilter.elementIds && this.detailsAvailabilityFilter.elementIds.length > 0) viewFilter.elementIds = this.detailsAvailabilityFilter.elementIds;
    if (this.detailsAvailabilityFilter.interval) viewFilter.intervals = [this.detailsAvailabilityFilter.interval];
    if (this.detailsAvailabilityFilter.level !== undefined) viewFilter.level = this.detailsAvailabilityFilter.level;

    let componentPath: string = '';
    if (this.user.isSystemAdmin) {
      // For admins just open data correction
      componentPath = 'data-ingestion/data-correction';
    } else if (this.user.permissions) {
      if (this.user.permissions.entryPermissions) {
        // If user has correction permissions then just open data correction      
        componentPath = 'data-ingestion/data-correction';
      } else if (this.user.permissions.ingestionMonitoringPermissions) {
        // If user has monitorig permissions then just open data explorer 
        componentPath = '/data-monitoring/data-explorer';
      }
    }

    if (componentPath) {
      const serialisedUrl = this.router.serializeUrl(
        this.router.createUrlTree([componentPath], { queryParams: viewFilter })
      );

      window.open(serialisedUrl, '_blank');
      this.open = false;
    } else {
      throw new Error('Developer error. Permissions could not be verified.');
    }
  }

}
