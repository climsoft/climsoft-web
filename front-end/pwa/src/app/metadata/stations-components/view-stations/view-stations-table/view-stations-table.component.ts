import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'; 
import { ViewStationsDefinition } from '../view-stations.definition';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';

@Component({
  selector: 'app-view-stations-table',
  templateUrl: './view-stations-table.component.html',
  styleUrls: ['./view-stations-table.component.scss']
})
export class ViewStationsTableComponent implements OnChanges {
  @Input()
  public stationsDef!: ViewStationsDefinition;

  constructor(
    private router: Router,
    private route: ActivatedRoute) { }

  ngOnChanges(changes: SimpleChanges): void {
  }

  protected refreshData(): void {
    this.stationsDef.resetDefinitionAndEntries();
  }

  protected loadEntries(): void{
    this.stationsDef.loadEntries();
  }

  protected get firstRowNum(): number {
    return (this.stationsDef.pageInputDefinition.page - 1) * this.stationsDef.pageInputDefinition.pageSize;
  }

  protected onEditStation(station: ViewStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

}
