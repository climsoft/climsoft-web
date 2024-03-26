import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUpdateStationModel } from 'src/app/core/models/create-update-station.model';
import { ViewStationModel } from 'src/app/core/models/view-station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

 // protected station!: ViewStationModel;
  protected stationId!: string;

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private router: Router,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {

    this.stationId = this.route.snapshot.params['id'];
 
    // this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
    //   this.station = data;
    // });

  }

  protected onDeleteStation(): void {
    //this.router.navigate(["station-characteristics", this.station.id], { relativeTo: this.route.parent });
  }

  

}
