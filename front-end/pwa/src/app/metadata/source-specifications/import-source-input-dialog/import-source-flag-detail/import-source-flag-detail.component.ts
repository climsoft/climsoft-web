import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FlagDefinition } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { IdMapping } from '../../id-mapping-table/id-mapping-table.component';

// Inclusion-control rule: this step uses a checkbox because the "off" state means
// literally nothing (no flag column). Steps whose "off" state still carries
// sub-config (default value or default id) use a radio instead.
@Component({
  selector: 'app-import-source-flag-detail',
  templateUrl: './import-source-flag-detail.component.html',
  styleUrls: ['./import-source-flag-detail.component.scss']
})
export class ImportSourceFlagDetailComponent {
  @Input() public flagDefinition: FlagDefinition | undefined;
  @Output() public flagDefinitionChange = new EventEmitter<FlagDefinition | undefined>();

  constructor(private cachedMetadataService: CachedMetadataService) { }

  protected get defaultFlagId(): number {
    const missingFlag = this.cachedMetadataService.getMissingFlag();
    return missingFlag ? missingFlag.id : 1;
  }

  protected onIncludesFlag(include: boolean): void {
    this.flagDefinition = include ? { flagColumnPosition: 0, flagsToFetch: undefined } : undefined;
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected onFetchFlagsChange(fetch: boolean): void {
    if (!this.flagDefinition) return;
    this.flagDefinition.flagsToFetch = fetch ? [] : undefined;
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected onMappingsChange(mappings: IdMapping[]): void {
    if (!this.flagDefinition) return;
    // Flag database IDs are numbers.
    this.flagDefinition.flagsToFetch = mappings.map(m => ({
      sourceId: m.sourceId,
      databaseId: Number(m.databaseId),
    }));
    this.flagDefinitionChange.emit(this.flagDefinition);
  }
}
