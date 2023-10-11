import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SourceModel } from '../../core/models/source.model';
import { SourcesService } from 'src/app/core/services/sources.service';
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-form-selection',
  templateUrl: './form-selection.component.html',
  styleUrls: ['./form-selection.component.scss']
})
export class FormSelectionComponent implements OnInit {
  stationId: string = '';
  stationName: string = '';
  sources: SourceModel[] = [];

  constructor(private stationsService: StationsService, private sourcesService: SourcesService, private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit(): void {

    this.stationId = this.route.snapshot.params['stationid'];

    this.stationsService.getStation(this.stationId).subscribe((data) => {
      this.stationName = `${data.id} - ${data.name}`;
    });

    //todo. later get forms assigned to this station only
    //get data sources of type forms
    this.sourcesService.getSources(1).subscribe((data) => {
      this.sources = data;
    });

  }

  onFormClicked(dataClicked: SourceModel): void {
    console.log('row clicked', dataClicked)
    this.router.navigate(['form-entry', this.stationId, dataClicked.id], { relativeTo: this.route.parent });

  }


}
