import { Component, Input } from '@angular/core';
import { StationDefinition } from '../../../../core/models/sources/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-station-detail',
  templateUrl: './import-source-station-detail.component.html',
  styleUrls: ['./import-source-station-detail.component.scss']
})
export class ImportSourceStationDetailComponent {

  @Input()
  public stationDefinition?: StationDefinition;

  protected onIncludeStation(include: boolean): void {
    this.stationDefinition = include ? { columnPosition: 0, stationsToFetch: undefined } : undefined;
  }

  protected onFetchStationsChange(fetch: boolean) {

    if (!this.stationDefinition) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.stationDefinition.stationsToFetch = fetch ? [{ sourceId: '', databaseId: '' }] : undefined;
  }

  protected onStationToFetchDatabaseIdEntry(index: number): void {
    if (!this.stationDefinition || !this.stationDefinition.stationsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    if (index === this.stationDefinition.stationsToFetch.length - 1) {
      this.stationDefinition.stationsToFetch.push({ sourceId: '', databaseId: '' });;
    }
  }

}
