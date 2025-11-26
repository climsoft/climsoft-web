import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/metadata/stations/services/station-forms.service';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { StationObsProcessingMethodEnum } from 'src/app/metadata/stations/models/station-obs-processing-method.enum';
import { Subject, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { ObservationsService } from '../../services/observations.service';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { AppDatabase, AppComponentState, UserAppStateEnum } from 'src/app/app-database';

interface StationView {
  station: StationCacheModel;
  forms?: ViewSourceModel[];
}

interface StationSelectionState {
  selectedStationId?: string,
  searchedStationIds?: string[];
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent implements OnDestroy {
  protected allStationViews!: StationView[];
  protected filteredStationViews!: StationView[];
  protected userStationSelectionState: StationSelectionState = {};
  private formSourcesNotDisabled: ViewSourceModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataService: CachedMetadataService,
    private stationFormsService: StationFormsService,
    private observationService: ObservationsService,
    private appAuthService: AppAuthService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Select Station');

    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$)
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      // Remove disabled forms
      this.formSourcesNotDisabled = this.cachedMetadataService.sourcesMetadata.filter(item => item.sourceType === SourceTypeEnum.FORM && !item.disabled);

      // Filter manual and hybrid stations only
      const allManualStations: StationView[] = this.cachedMetadataService.stationsMetadata.filter(
        item => item.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || item.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
      ).map(data => { return { station: data } });
      this.setStationsBasedOnPermissions(allManualStations);
    });

    this.observationService.syncObservations();
  }


  ngOnDestroy() {
    // Save the state before destroying
    AppDatabase.instance.userSettings.put({ name: UserAppStateEnum.DATA_ENTRY_STATION_SELECTION, parameters: this.userStationSelectionState });
    console.log('saved: ', this.userStationSelectionState);

    this.destroy$.next();
    this.destroy$.complete();
  }

  private setStationsBasedOnPermissions(allManualStations: StationView[]) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;

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

      this.filteredStationViews = this.allStationViews;
      this.loadAndRestoreUserStationSelectionState()
    });
  }

  protected async loadAndRestoreUserStationSelectionState() {
    const savedUserStationSelectionState: AppComponentState | undefined = await AppDatabase.instance.userSettings.get(UserAppStateEnum.DATA_ENTRY_STATION_SELECTION);
    if (savedUserStationSelectionState) {
      this.userStationSelectionState = savedUserStationSelectionState.parameters;
      const searchedStationIds = this.userStationSelectionState.searchedStationIds;
      if (searchedStationIds) {
        this.filteredStationViews = this.allStationViews.filter(item => searchedStationIds.includes(item.station.id));
      }

      const selectedStationId = this.userStationSelectionState.selectedStationId;
      if (selectedStationId) {
        const stationView = this.filteredStationViews.find(stationView => stationView.station.id === selectedStationId);
        if (stationView) {
          this.loadFormsForStation(stationView);
        }
      }

    }
  }

  protected getVisibleStationsForSearchDialog(): string[] {
    return this.allStationViews.map(item => item.station.id);
  }

  protected onSearchInput(searchedIds: string[]): void {
    if (searchedIds.length > 0) {
      this.filteredStationViews = this.allStationViews.filter(item => searchedIds.includes(item.station.id));
      this.userStationSelectionState.searchedStationIds = searchedIds;
    } else {
      this.filteredStationViews = this.allStationViews;
      this.userStationSelectionState.searchedStationIds = undefined;
    }
  }

  protected onStationSelected(stationView: StationView): void {
    if (stationView.station.id === this.userStationSelectionState.selectedStationId) {
      this.userStationSelectionState.selectedStationId = undefined; // Will hide the forms 
    } else {
      this.userStationSelectionState.selectedStationId = stationView.station.id;
      this.loadFormsForStation(stationView);
    }
  }

  protected onFormClick(stationId: string, sourceId: number): void {
    this.router.navigate(['form-entry', stationId, sourceId], { relativeTo: this.route.parent });
  }

  private loadFormsForStation(stationView: StationView): void {
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

}
