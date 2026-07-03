import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StationDefinition } from '../../models/import-source-tabular-params.model';
import { IdMapping } from '../../id-mapping-table/id-mapping-table.component';

// Inclusion-control rule: this step uses a checkbox because the "off" state means
// literally nothing (no station column). Steps whose "off" state still carries
// sub-config (default value or default id) use a radio instead.
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
    this.stationDefinitionChange.emit(this.stationDefinition);
  }

  protected onMappingsChange(mappings: IdMapping[]): void {
    if (!this.stationDefinition) return;
    // Station database IDs are strings.
    this.stationDefinition.stationsToFetch = mappings.map(m => ({
      sourceId: m.sourceId,
      databaseId: String(m.databaseId),
    }));
    this.stationDefinitionChange.emit(this.stationDefinition);
  }
}
