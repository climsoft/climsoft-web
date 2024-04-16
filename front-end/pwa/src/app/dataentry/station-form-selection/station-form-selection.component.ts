import { Component } from '@angular/core';
import { CreateUpdateStationModel } from '../../core/models/create-update-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/core/services/station-forms.service'; 
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';

export interface StationView extends CreateUpdateStationModel {
  forms?: ViewSourceModel<string>[];
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent {

  protected stations!: StationView[];

  constructor(private pagesDataService: PagesDataService,
    private stationsService: StationsService,
    private stationFormsService: StationFormsService,
    private router: Router, private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Select Station');

    this.stationsService.getStations().subscribe(data => {
      this.stations = data.map(station => ({ ...station }));
    });

  }

  protected onSearchClick(): void {

  }

  protected loadStationForms(station: StationView): void {
    if (!station.forms) {
      this.stationFormsService.getStationForms(station.id).subscribe(data => {
        station.forms = data;
      });
    }

  }

  protected onFormClick(stationId: string, sourceId: number): void {
    this.router.navigate(['form-entry', stationId, sourceId], { relativeTo: this.route.parent });
  }

}
