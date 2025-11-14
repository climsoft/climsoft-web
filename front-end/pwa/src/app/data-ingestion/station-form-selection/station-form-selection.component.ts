import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/metadata/stations/services/station-forms.service';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { StationObsProcessingMethodEnum } from 'src/app/metadata/stations/models/station-obs-processing-method.enum';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { ObservationsService } from '../services/observations.service';

interface StationView {
  station: StationCacheModel;
  forms?: ViewSourceModel[];
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent implements OnDestroy {
  protected allStationViews!: StationView[];
  protected stationViews!: StationView[];
  private searchedIds!: string[];
  protected stationIdSelected: string | undefined;
  private formSourcesNotDisabled: ViewSourceModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private stationFormsService: StationFormsService,
    private sourceCacheService: SourceTemplatesCacheService,
    private observationService: ObservationsService,
    private appAuthService: AppAuthService,
    private router: Router,
    private route: ActivatedRoute) {
      
    this.pagesDataService.setPageHeader('Select Station');

    this.sourceCacheService.cachedSources.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      // Important. Remove disabled forms
      this.formSourcesNotDisabled = data.filter(item => item.sourceType === SourceTypeEnum.FORM && !item.disabled);
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // Filter manual and hybrid stations only
      const allManualStations: StationView[] = data.filter(
        item => item.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL ||
          item.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
      ).map(data => { return { station: data } });
      this.setStationsBasedOnPermissions(allManualStations);
    });

    this.observationService.syncObservations();
  }


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setStationsBasedOnPermissions(allManualStations: StationView[]) {
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.allStationViews = allManualStations;
      } else if (user.permissions && user.permissions.entryPermissions) {
        if (user.permissions.entryPermissions.stationIds) {
          const stationIdsAllowed: string[] = user.permissions.entryPermissions.stationIds;
          this.allStationViews = allManualStations.filter(item => stationIdsAllowed.includes(item.station.id));
        } else {
          this.allStationViews = allManualStations;
        }
      } else {
        throw new Error('Data entry not allowed');
      }

      this.filterBasedOnSearchedIds();
    });
  }

  protected getVisibleStationsForSearchDialog(): string[]{
    return this.allStationViews.map(item=> item.station.id);
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterBasedOnSearchedIds();
  }

  private filterBasedOnSearchedIds(): void {
    this.stationViews = this.searchedIds && this.searchedIds.length > 0 ? this.allStationViews.filter(item => this.searchedIds.includes(item.station.id)) : this.allStationViews;
  }

  protected onStationSelected(stationView: StationView): void {
    if (stationView.station.id === this.stationIdSelected) {
      this.stationIdSelected = undefined; // will hide the forms 
      return;
    }

    this.stationIdSelected = stationView.station.id;

    // No need to reload the station forms if already loaded if they have
    if (!stationView.forms) {
      this.stationFormsService.getFormsAssignedToStation(stationView.station.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe(data => {
        //Filter out any disabled form
        stationView.forms = data.filter(stationForm => this.formSourcesNotDisabled.find(form => stationForm.id === form.id));
      });
    }

  }

  protected onFormClick(stationId: string, sourceId: number): void {
    this.router.navigate(['form-entry', stationId, sourceId], { relativeTo: this.route.parent });
  }

}
