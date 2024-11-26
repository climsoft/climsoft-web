import { Component } from '@angular/core';
import { CreateStationModel } from '../../core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/core/services/stations/station-forms.service';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { Observable } from 'rxjs';
import { ViewStationQueryModel } from 'src/app/core/models/stations/view-station-query.model';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';

export interface StationView extends StationCacheModel {
  forms?: ViewSourceModel[];
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent {

  protected stations!: StationView[];
  protected allStations!: StationView[];

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private stationFormsService: StationFormsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Select Station');

    this.stationsCacheService.cachedStations.subscribe(data => {
      this.allStations = data.filter(item => item.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || item.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID);
      this.stations = this.allStations;
    });

  }

  protected onSearchInput(searchedIds: string[]): void {
    // TODO. Later change this
    this.stations = this.allStations;

    if (searchedIds.length>0) {
      this.stations = this.allStations.filter(item => searchedIds.includes(item.id));
    }
  }

  protected loadStationForms(station: StationView): void {
    if (!station.forms) {
      this.stationFormsService.find(station.id).subscribe(data => {
        station.forms = data;
      });
    }

  }

  protected onFormClick(stationId: string, sourceId: number): void {
    this.router.navigate(['form-entry', stationId, sourceId], { relativeTo: this.route.parent });
  }

}
