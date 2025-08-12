import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { ObservationDefinition } from '../../form-entry/defintitions/observation.definition';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';

interface ObservationEntry {
  stationId: string;
  stationName: string;
  level: number;
  sourceName: string;
  formattedDatetime: string;
  intervalName: string;
  elementValues: ElementValue[];
}

interface ElementValue {
  obsDef: ObservationDefinition;
  delete: boolean;
}

@Component({
  selector: 'app-data-correction-pivot',
  templateUrl: './data-correction-pivot.component.html',
  styleUrls: ['./data-correction-pivot.component.scss']
})
export class DataCorrectionPivotComponent implements OnChanges {
  @Input()
  public observations!: CreateObservationModel[];

  @Input()
  public utcOffset!: number;

  @Input()
  public stationIds!: string[] | undefined;

  @Input()
  public level: number | undefined;

  @Input()
  public intervals!: number[] | undefined;

  @Input()
  public sourceIds!: number[] | undefined;

  @Output()
  public valueChange: EventEmitter<void> = new EventEmitter<void> ;

  protected groupedEntries!: ObservationEntry[];
  protected elements!: { elementId: number, elementAbbrv: string }[];

  constructor(
    private cachedMetadataSearchService: CachedMetadataSearchService,
  ) {


  }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.observations && this.utcOffset !== undefined) {
      this.loadData();
    }
  }

  private loadData(): void {
    const groupedEntriesMap = new Map<string, ObservationEntry>();
    const newElements: { elementId: number, elementAbbrv: string }[] = [];

    for (const obs of this.observations) {
      const stationMetadata = this.cachedMetadataSearchService.getStation(obs.stationId);
      const elementMetadata = this.cachedMetadataSearchService.getElement(obs.elementId);
      const sourceMetadata = this.cachedMetadataSearchService.getSource(obs.sourceId);

      const key = `${obs.stationId}|${obs.sourceId}|${obs.level}|${obs.datetime}|${obs.interval}`;
      let groupedEntry = groupedEntriesMap.get(key);
      if (!groupedEntry) {
        groupedEntry = {
          stationId: stationMetadata.id,
          stationName: stationMetadata.name,
          level: obs.level,
          sourceName: sourceMetadata.name,
          formattedDatetime: DateUtils.getPresentableDatetime(obs.datetime, this.utcOffset),
          intervalName: IntervalsUtil.getIntervalName(obs.interval),
          elementValues: [],
        };

        groupedEntriesMap.set(key, groupedEntry);
      }

      if (!newElements.find(item => item.elementId === elementMetadata.id)) {
        newElements.push({ elementId: elementMetadata.id, elementAbbrv: elementMetadata.abbreviation });
      }

      groupedEntry.elementValues.push({
        obsDef: new ObservationDefinition(obs,
          elementMetadata,
          sourceMetadata.allowMissingValue,
          false,
          undefined,
          this.utcOffset,
          false),
        delete: false,
      });

    }
    this.groupedEntries = Array.from(groupedEntriesMap.values());
    this.elements = newElements;



  }

  protected hasElementValue(elementId: number, elementValues: ElementValue[]): boolean {
    const elementValue = elementValues.find(item => item.obsDef.observation.elementId === elementId);
    return elementValue ? true : false;
  }

  protected getElementValue(elementId: number, elementValues: ElementValue[]): ElementValue {
    const elementValue = elementValues.find(item => item.obsDef.observation.elementId === elementId);
    if (!elementValue) throw new Error('Element not found');
    return elementValue;
  }

  protected onUserInput() {
    this.valueChange.emit();
    //this.numOfChanges = 0;
    // for (const obsEntry of this.observationsEntries) {
    //   if (obsEntry.delete || obsEntry.newElementId || obsEntry.newStationId || obsEntry.obsDef.observationChanged) {
    //     this.numOfChanges++;
    //   }
    // }
  }


}