import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError, finalize } from 'rxjs/operators';
import { ElementModel } from 'src/app/core/models/element.model'; 
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model';
import { StationModel } from 'src/app/core/models/station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

  protected station!: StationModel;

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private router: Router,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {

    const stationId = this.route.snapshot.params['id'];

    this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
      this.station = data;
    });

  }

  protected onEditCharacteristics(): void {
    this.router.navigate(["station-characteristics", this.station.id], { relativeTo: this.route.parent });
  }

  

}
