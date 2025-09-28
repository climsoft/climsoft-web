import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { DataAvailaibilityDetailsModel } from '../models/data-availability-details.model';
import { DataAvailabilityQueryModel, DurationTypeEnum } from '../models/data-availability-query.model';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { Router } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilityDetailsQueryModel } from '../models/data-availability-details-query.model';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { DateUtils } from 'src/app/shared/utils/date.utils';


interface DataAvailaibilityDetailsView extends DataAvailaibilityDetailsModel {
  stationName: string;
  elementAbbrv: string;
  intervalName: string;
  fromFormattedDatetime: string;
  toFormattedDatetime: string;
}

@Component({
  selector: 'app-data-availability-details',
  templateUrl: './data-availability-details.component.html',
  styleUrls: ['./data-availability-details.component.scss']
})
export class DataAvailabilityDetailsComponent implements OnDestroy {
  protected detailsAvailabilityFilter!: DataAvailabilityQueryModel;
  protected durationTypeEnum: typeof DurationTypeEnum = DurationTypeEnum; // used by the template
  protected open: boolean = false;

  protected availabilityDetails!: DataAvailaibilityDetailsView[];
  private user!: LoggedInUserModel;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
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

  public showDialog(filter: DataAvailabilityQueryModel): void {
    this.detailsAvailabilityFilter = filter;
    this.open = true;

    // Load gap analysis
    this.loadDetails({
      stationIds: filter.stationIds,
      elementIds: filter.elementIds,
      interval: filter.interval,
      level: filter.level,
      fromDate: filter.fromDate,
      toDate: filter.toDate,
    })
  }

  private loadDetails(filter: DataAvailabilityDetailsQueryModel): void {
    console.log('filter: ', filter);
    this.observationService.findDataAvailabilityDetails(filter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        const uctOffset = this.cachedMetadataSearchService.getUTCOffSet();

         console.log('uctOffset: ', uctOffset);
          console.log('data: ', data);

        this.availabilityDetails = data.map(details => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(details.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(details.elementId);
          return {
            ...details,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            intervalName: IntervalsUtil.getIntervalName(details.interval),
            fromFormattedDatetime: DateUtils.getPresentableDatetime(details.fromDate, uctOffset),
            toFormattedDatetime: DateUtils.getPresentableDatetime(details.toDate, uctOffset),
          };

           

        });

         console.log('availabilityDetails: ', this.availabilityDetails);



      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Data Availability Details', message: err, type: ToastEventTypeEnum.ERROR });
      },
    });
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
      elementIds: this.detailsAvailabilityFilter.elementIds,
      level: this.detailsAvailabilityFilter.level,
      fromDate: this.detailsAvailabilityFilter.fromDate,
      toDate: this.detailsAvailabilityFilter.toDate,
    };

    if (this.detailsAvailabilityFilter.interval) viewFilter.intervals = [this.detailsAvailabilityFilter.interval];

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
