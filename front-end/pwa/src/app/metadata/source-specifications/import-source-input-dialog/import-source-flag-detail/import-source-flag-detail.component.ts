import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FlagDefinition } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-import-source-flag-detail',
  templateUrl: './import-source-flag-detail.component.html',
  styleUrls: ['./import-source-flag-detail.component.scss']
})
export class ImportSourceFlagDetailComponent implements OnChanges {
  @Input() public flagDefinition: FlagDefinition | undefined;
  @Output() public flagDefinitionChange = new EventEmitter<FlagDefinition | undefined>();

  protected flagsToFetchHolder!: { sourceId: string, databaseId: number }[];

  constructor(private cachedMetadataService: CachedMetadataService) {
  }

  private get defaultFlagId(): number {
    const missingFlag = this.cachedMetadataService.getMissingFlag();
    return missingFlag ? missingFlag.id : 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.flagDefinition && this.flagDefinition.flagsToFetch) {
      this.flagsToFetchHolder = [...this.flagDefinition.flagsToFetch];
      //Add new placeholder values
      this.flagsToFetchHolder.push({ sourceId: '', databaseId: this.defaultFlagId });
    }
  }

  protected onIncludesFlag(include: boolean): void {
    this.flagDefinition = include ? { flagColumnPosition: 0, flagsToFetch: undefined } : undefined;
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected onFetchFlagsChange(fetch: boolean) {
    if (!this.flagDefinition) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.flagDefinition.flagsToFetch = fetch ? [] : undefined;

    this.flagsToFetchHolder = [{ sourceId: '', databaseId: this.defaultFlagId }];
  }

  protected onFlagsToFetchEntry(): void {
    if (!this.flagDefinition?.flagsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.flagsToFetchHolder[this.flagsToFetchHolder.length - 1];
    if (last.sourceId !== '') {
      // Set the new valid values
      this.flagDefinition.flagsToFetch = [...this.flagsToFetchHolder];

      //Add new placeholder values
      this.flagsToFetchHolder.push({ sourceId: '', databaseId: this.defaultFlagId });
    }
  }

  protected onFlagEntry(index: number, flagId: number | null): void {
    if (!this.flagDefinition?.flagsToFetch) {
      return;
    }

    if (this.flagsToFetchHolder[index].sourceId && flagId !== null) {
      this.flagsToFetchHolder[index].databaseId = flagId;

      // Set the new valid values
      this.flagDefinition.flagsToFetch = [...this.flagsToFetchHolder];
    } else {
      this.flagsToFetchHolder.splice(index, 1);
    }
  }

}
