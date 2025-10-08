import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PagesDataService } from '../services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  protected user!: LoggedInUserModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataSearchService: CachedMetadataService,) {
    this.pagesDataService.setPageHeader('Dashboard');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      this.user = user;
    });

    // calling this to make sure when a user re-logs in. The metadata updates automatically.
    // This also makes other components to have access to the metadata almost instantaneously.
    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (allMetadataLoaded) console.log('all metadata loaded');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected notifications = [
    // { icon: 'bi-check-circle-fill text-success', message: 'All systems are operational' },
    { icon: 'bi-exclamation-circle', message: '0 observations failed QC checks today' },
    // { icon: 'bi-exclamation-triangle-fill text-danger', message: 'Station KE005 has not reported in 3 hours' },
    { icon: 'bi-wrench-adjustable-circle ', message: 'A new Climsoft Web update (preview-3-beta) is available' },
    // { icon: 'bi-cloud-arrow-down-fill text-primary', message: 'Last data import: 2025-05-22 18:15 UTC' }
  ];

  protected quickLinks = [
    { label: 'Help & User Manual', icon: 'bi-book', url: '#' },
    // { label: 'API Documentation', icon: 'bi-code-slash', url: '#' },
    { label: 'Submit Feedback', icon: 'bi-chat-dots', url: '#' },
    // { label: 'Log Out', icon: 'bi-box-arrow-right', url: '#' }
  ];

}
