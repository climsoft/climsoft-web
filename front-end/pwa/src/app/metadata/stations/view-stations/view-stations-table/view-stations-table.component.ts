import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; 
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-view-stations-table',
  templateUrl: './view-stations-table.component.html',
  styleUrls: ['./view-stations-table.component.scss']
})
export class ViewStationsTableComponent implements OnChanges {
  @Input()
  public stations!: StationCacheModel[];

  constructor(
    private router: Router,
    private route: ActivatedRoute) { }

  ngOnChanges(changes: SimpleChanges): void {
  }

  protected onEditStation(station: StationCacheModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

}
