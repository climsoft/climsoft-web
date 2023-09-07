import { Component, OnInit } from '@angular/core';
import { RepoService } from '../../shared/services/repo.service';
import { Station } from '../../shared/models/station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';

@Component({
  selector: 'app-station-selection',
  templateUrl: './station-selection.component.html',
  styleUrls: ['./station-selection.component.scss']
})
export class StationSelectionComponent {
  stations!: Station[];

  constructor(private repo: RepoService, private router: Router, private route: ActivatedRoute) {

    this.stations = [
      { id: '1', name: 'JKIA Airport' },
      { id: '2', name: 'KMD Headquarters' },
      { id: '3', name: 'ICPAC Main' },
      { id: '4', name: 'KALRO Machakos' }];

  }

  ngOnInit(): void {
  }

  public onStationClick(dataClicked: DataClicked) {
    this.router.navigate(['form-selection', dataClicked.dataSourceItem['id']], {relativeTo: this.route.parent});
  }



}
