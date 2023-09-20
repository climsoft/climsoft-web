import { Component, OnInit } from '@angular/core'; 
import { Station } from '../../core/models/station.model';
import { Router } from '@angular/router'; 
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent implements OnInit {

  stations!: Station[];

  constructor(private stationsService: StationsService,  private router: Router) {

    this.stationsService.getStations().subscribe(data => {
      this.stations = data;
    });


  }

  ngOnInit(): void {
  }

  public onStationClick(dataClicked: { [key: string]: any }) {
    // this.router.navigate(
    //   ['dataentry', 'forms'],
    //   { state: { viewTitle: 'Form Entry', subView: true, stationData: dataClicked } });
  }

  public newStationClick(): void { }

}
