import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { Subject, takeUntil } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { ActivatedRoute } from '@angular/router';
import { DataCorrectorComponent } from './data-corrector/data-corrector.component';

@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dataCorrector') dataCorrector!: DataCorrectorComponent;

  protected queryFilter!: ViewObservationQueryModel;
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');
  }

  ngAfterViewInit(): void {

  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {

      this.cachedMetadataSearchService.allMetadataLoaded.pipe(
        takeUntil(this.destroy$),
      ).subscribe(allMetadataLoaded => {
        if (!allMetadataLoaded) return;

        const newQueryFilter: ViewObservationQueryModel = { deleted: false };

        if (params.keys.length > 0) {
          const stationIds: string[] = params.getAll('stationIds');
          const elementIds: string[] = params.getAll('elementIds');
          const intervals: string[] = params.getAll('intervals');
          const level: string | null = params.get('level');
          const fromDate: string | null = params.get('fromDate');
          const toDate: string | null = params.get('toDate');

          if (stationIds.length > 0) newQueryFilter.stationIds = stationIds;
          if (elementIds.length > 0) newQueryFilter.elementIds = elementIds.map(Number);
          if (intervals.length > 0) newQueryFilter.intervals = intervals.map(Number);
          if (level) newQueryFilter.level = parseInt(level, 10);
          if (fromDate) newQueryFilter.fromDate = fromDate;
          if (toDate) newQueryFilter.toDate = toDate;
        } else {
          const toDate: Date = new Date();
          const fromDate: Date = new Date();
          fromDate.setDate(toDate.getDate() - 1);

          newQueryFilter.level = 0;
          newQueryFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(fromDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract');
          newQueryFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(toDate.toISOString(), this.cachedMetadataSearchService.utcOffSet, 'subtract');
        }

        // Temporary work around to eliminate the angular detection errors. Once async await and angular signals are adopted. This will no longer be necessary.
        setTimeout(() => {
          this.queryFilter = newQueryFilter;
          this.dataCorrector.executeQuery(newQueryFilter);
        }, 0);

      });

    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return DataCorrectionComponent.name;
  }

  protected onQueryClick(queryFilter: ViewObservationQueryModel): void {
    this.queryFilter = queryFilter;
    this.enableSaveButton = false;
    this.dataCorrector.executeQuery(queryFilter);
  }

  protected onLoadingObservations(loading: boolean): void {
    this.enableQueryButton = !loading;
  }

  protected onUserChanges(changedCount: number) {
    this.enableSaveButton = changedCount > 0;
  }

  protected onSubmitChanges(): void {
    if (this.queryFilter && this.enableSaveButton) {
      this.dataCorrector.submit();
    }
  }

}
