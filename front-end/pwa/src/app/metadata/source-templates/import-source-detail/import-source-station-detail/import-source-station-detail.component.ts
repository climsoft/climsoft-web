import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StationDefinition } from '../../models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-station-detail',
  templateUrl: './import-source-station-detail.component.html',
  styleUrls: ['./import-source-station-detail.component.scss']
})
export class ImportSourceStationDetailComponent implements OnChanges {

  @Input()
  public stationDefinition?: StationDefinition;

  @Output()
  public stationDefinitionChange = new EventEmitter<StationDefinition | undefined>();

  protected fetchStationsHolder!: { sourceId: string, databaseId: string }[];

  ngOnChanges(changes: SimpleChanges): void {

    if (this.stationDefinition && this.stationDefinition.stationsToFetch) {
      this.fetchStationsHolder = [... this.stationDefinition.stationsToFetch];
      //Add new placholder values
      this.fetchStationsHolder.push({ sourceId: '', databaseId: '' });
    }

  }

  protected onIncludeStation(include: boolean): void {
    this.stationDefinition = include ? { columnPosition: 0, stationsToFetch: undefined } : undefined;
    this.stationDefinitionChange.emit(this.stationDefinition);
  }

  protected onFetchStationsChange(fetch: boolean) {

    if (!this.stationDefinition) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.fetchStationsHolder =  [{ sourceId: '', databaseId: '' }] ;
    this.stationDefinition.stationsToFetch = fetch ? [] : undefined;
  }

  protected onStationToFetchEntry(): void {
    if (!this.stationDefinition || !this.stationDefinition.stationsToFetch || !this.fetchStationsHolder) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.fetchStationsHolder[this.fetchStationsHolder.length - 1];
    if (last.sourceId !== '' && last.databaseId !== '') {

      // Set the new valid values from the place holder
      this.stationDefinition.stationsToFetch = [...this.fetchStationsHolder];

      //Add new placholder values
      this.fetchStationsHolder.push({ sourceId: '', databaseId: '' });

    }
  }

}
