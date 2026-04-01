import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { Subject, takeUntil } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { ActivatedRoute } from '@angular/router';
import { BulkPkUpdateDialogComponent } from './bulk-pk-update-dialog/bulk-pk-update-dialog.component';
import { BulkDeleteDialogComponent } from './bulk-delete-dialog/bulk-delete-dialog.component';
import { SourceCheckDialogComponent } from './source-check-dialog/source-check-dialog.component';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-data-correction',
  templateUrl: './data-correction.component.html',
  styleUrls: ['./data-correction.component.scss']
})
export class DataCorrectionComponent implements OnInit, OnDestroy {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;
  @ViewChild('dlgBulkPkUpdate') dlgBulkPkUpdate!: BulkPkUpdateDialogComponent;
  @ViewChild('dlgBulkDelete') dlgBulkDelete!: BulkDeleteDialogComponent;
  @ViewChild('dlgSourceCheck') dlgSourceCheck!: SourceCheckDialogComponent;

  protected queryFilter!: ViewObservationQueryModel;
  protected enableSaveButton: boolean = false;
  protected enableQueryButton: boolean = true;
  protected submitChanges: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Correction');
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

        this.queryFilter = newQueryFilter;
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
    this.submitChanges = false;
  }

  protected onLoadingObservations(loading: boolean): void {
    this.enableQueryButton = !loading;
  }

  protected onUserChanges(changedCount: number) {
    this.enableSaveButton = changedCount > 0;
  }

  protected onSubmitChanges(): void {
    if (this.queryFilter && this.enableSaveButton) {
      this.submitChanges = true;
    }
  }

}
