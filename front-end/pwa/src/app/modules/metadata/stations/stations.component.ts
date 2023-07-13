import { Component, OnInit } from '@angular/core';
import { RepoService } from '../../shared/services/repo.service';
import { Station } from '../../shared/models/station.model';
import { Router } from '@angular/router';
import { DataClicked } from '../../shared/controls/data-list-view/data-list-view.component';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent implements OnInit {

  stations!: Station[];

  constructor(private repo: RepoService, private router: Router) {

    this.stations = [
      { id: '1', name: 'JKIA Airport' },
      { id: '2', name: 'KMD Headquarters' },
      { id: '3', name: 'ICPAC Main' },
      { id: '4', name: 'KALRO Machakos' }];

  }

  ngOnInit(): void {
  }

  public onStationClick(dataClicked: DataClicked) {
    if (dataClicked.actionName === 'Entry') {
      this.router.navigate(
        ['dataentry', 'forms'],
        { state: { viewTitle: 'Form Entry', subView: true, stationData: dataClicked.dataSourceItem } });

    } else if (dataClicked.actionName === 'View') {

    }

  }

}
