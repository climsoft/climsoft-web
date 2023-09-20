import { Component, OnInit } from '@angular/core'; 
import { Station } from '../../core/models/station.model';
import { ActivatedRoute, Router } from '@angular/router'; 
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-station-selection',
  templateUrl: './station-selection.component.html',
  styleUrls: ['./station-selection.component.scss']
})
export class StationSelectionComponent {
  stations!: Station[];

  constructor(private stationsService: StationsService, private router: Router, private route: ActivatedRoute) {

    this.stationsService.getStations().subscribe(data => {
      this.stations = data;
    });

  }

  ngOnInit(): void {
  }

  public onStationClick(dataClicked: { [key: string]: any }) {
    this.router.navigate(['form-selection', dataClicked['id']], {relativeTo: this.route.parent});
  }



}
