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
import { AppDatabase, UserSetting, UserSettingEnum } from 'src/app/app-database'; 

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

      this.filterBasedOnSearchedIds();
    });
  }

  protected getVisibleStationsForSearchDialog(): string[] {
    return this.allStationViews.map(item => item.station.id);
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterBasedOnSearchedIds();
  }

  private filterBasedOnSearchedIds(): void {
    this.stationViews = this.searchedIds && this.searchedIds.length > 0 ? this.allStationViews.filter(item => this.searchedIds.includes(item.station.id)) : this.allStationViews;
  }

  protected async loadUserSettings() {
    // TODO. Left here
    //  const savedUserFormSetting: UserSetting | undefined = await AppDatabase.instance.userSettings.get(UserSettingEnum.ENTRY_FORM_SETTINGS);
    //    if (savedUserFormSetting) {
    //      this.userFormSettings = savedUserFormSetting.parameters;
    //    } else {
    //      const defaultUserFormSettings: UserFormSettingStruct = {
    //        displayExtraInformationOption: false,
    //        incrementDateSelector: false,
    //        fieldsBorderSize: 1,
    //        linearLayoutSettings: {
    //          height: 60,
    //          maxRows: 5
    //        },
    //        gridLayoutSettings: {
    //          height: 60,
    //          navigation: 'horizontal',
    //        }
    //      }
   
    //      this.userFormSettings = defaultUserFormSettings;
    //    }  
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
