import { Component } from '@angular/core';
import { StationModel } from '../../core/models/station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationFormModel } from 'src/app/core/models/station-form.model';

export interface StationView extends StationModel {
  forms?: StationFormModel[]; 
}

@Component({
  selector: 'app-station-form-selection',
  templateUrl: './station-form-selection.component.html',
  styleUrls: ['./station-form-selection.component.scss']
})
export class StationFormSelectionComponent {

  stations!: StationView[];

  constructor(private pagesDataService: PagesDataService, private stationsService: StationsService, private router: Router, private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Select Station');

    this.stationsService.getStations().subscribe(data => {
      this.stations = data.map(station => ({ ...station}));
    });

  }

  public onSearchClick(): void {

  }

  public loadStationForms(station: StationView): void {
    if(!station.forms){
      this.stationsService.getStationForms(station.id).subscribe(data => {
        station.forms = data;
      });
    } 

  }

  public onFormClick(form: StationFormModel): void {
    this.router.navigate(['form-entry', form.stationId, form.sourceId], { relativeTo: this.route.parent });
  }

}
