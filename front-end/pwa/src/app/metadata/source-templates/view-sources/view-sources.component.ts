import { Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTemplatesCacheService } from '../services/source-templates-cache.service';
import { StationFormsService } from '../../stations/services/station-forms.service';
import { StationsSearchDialogComponent } from '../../stations/stations-search-dialog/stations-search-dialog.component';
import { StringUtils } from 'src/app/shared/utils/string.utils';

interface View extends ViewSourceModel {
  // Applicable to form source only
  assignedStations: number;
  sourceTypeName: string;
}

@Component({
  selector: 'app-view-sources',
  templateUrl: './view-sources.component.html',
  styleUrls: ['./view-sources.component.scss']
})
export class ViewSourcesComponent implements OnDestroy {
  @ViewChild('appSearchAssignedStations') appStationSearchDialog!: StationsSearchDialogComponent;

  protected sources!: View[];
  protected selectedSource!: View;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourceTemplatesCacheService,
    private stationFormsService: StationFormsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Source Specifications');

    // Get all sources 
    this.sourcesCacheService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(sources => {

      this.sources = sources.map(item => {
        return { ...item, sourceTypeName: StringUtils.formatEnumForDisplay(item.sourceType), assignedStations: 0 }
      });

      // Remove version 4 source from display. It's not editable by user
      this.sources = this.sources.filter(item => item.name !== 'climsoft_v4');

      // Get number of stations assigned to use form
      this.stationFormsService.getStationCountPerForm().pipe(
        take(1),
      ).subscribe((stationsCountPerSource) => {
        for (const count of stationsCountPerSource) {
          const source = this.sources.find(item => item.id === count.formId);
          if (source) {
            source.assignedStations = count.stationCount
          }
        }
      });
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onOptionsClicked(sourceTypeName: 'Add Form' | 'Add Import' | 'Delete All') {
    let routeName: string = '';
    switch (sourceTypeName) {
      case 'Add Form':
        routeName = 'form-source-detail';
        break;
      case 'Add Import':
        routeName = 'import-source-detail';
        break;
      case 'Delete All':
        this.sourcesCacheService.deleteAll().pipe(
          take(1)
        ).subscribe(data => {
          this.pagesDataService.showToast({ title: "Sources Deleted", message: `All sources deleted`, type: ToastEventTypeEnum.SUCCESS });
        });
        return;
      default:
        throw new Error('Developer error, option not supported');
    }

    this.router.navigate([routeName, 'new'], { relativeTo: this.route.parent });
  }

  protected onEditSource(source: ViewSourceModel): void {
    const sourceType: SourceTypeEnum = source.sourceType;
    let routeName: string;
    switch (sourceType) {
      case SourceTypeEnum.FORM:
        routeName = 'form-source-detail'
        break;
      case SourceTypeEnum.IMPORT:
        routeName = 'import-source-detail'
        break;
      default:
        throw new Error('Developer error: Source type not supported');
    }
    this.router.navigate([routeName, source.id], { relativeTo: this.route.parent });
  }

  protected onAssignStationsClicked(selectedSource: View) {
    this.selectedSource = selectedSource;
    this.stationFormsService.getStationsAssignedToUseForm(selectedSource.id).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.appStationSearchDialog.showDialog(data);
    });
  }

  protected onAssignFormToStationsInput(stationIds: string[]): void {
    this.stationFormsService.putStationsAssignedToUseForm(this.selectedSource.id, stationIds).pipe(
      take(1)
    ).subscribe(data => {
      this.selectedSource.assignedStations = data.length;
    });
  }



}
