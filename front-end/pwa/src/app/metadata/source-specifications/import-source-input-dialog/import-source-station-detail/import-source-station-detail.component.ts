import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StationDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-station-detail',
  templateUrl: './import-source-station-detail.component.html',
  styleUrls: ['./import-source-station-detail.component.scss']
})
export class ImportSourceStationDetailComponent {

  @Input()
  public stationDefinition?: StationDefinition;

  @Output()
  public stationDefinitionChange = new EventEmitter<StationDefinition | undefined>();

  protected onIncludeStation(include: boolean): void {
    this.stationDefinition = include ? { columnPosition: 0, stationsToFetch: undefined } : undefined;
    this.stationDefinitionChange.emit(this.stationDefinition);
  }

  protected onFetchStationsChange(fetch: boolean): void {
    if (!this.stationDefinition) {
      return;
    }
    this.stationDefinition.stationsToFetch = fetch ? [] : undefined;
  }

  protected onAddStationMapping(): void {
    this.stationDefinition?.stationsToFetch?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveStationMapping(index: number): void {
    this.stationDefinition?.stationsToFetch?.splice(index, 1);
    this.stationDefinitionChange.emit(this.stationDefinition);
  }

}
