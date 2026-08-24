import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FlagDefinition } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { IdMapping } from '../../id-mapping-table/id-mapping-table.component';

/**
 * Three-way flag configuration for a tabular import spec.
 *
 * - `NONE`     — the file has no flag information.
 * - `SEPARATE` — a dedicated flag column, position + optional source→db mapping. hidden when the parent is in a wide-pivot mode (no explicit value column exists to attach a separate flag column to)
 * - `INLINE`   — cells in the value column carry a trailing letter as the flag
 *                (e.g. `0.5T` → value 0.5, flag T). Works for both column-based
 *                value sources and wide-pivot sources.
 */
export enum FlagMode {
  NONE = 'NONE',
  SEPARATE = 'SEPARATE',
  INLINE = 'INLINE',
}

@Component({
  selector: 'app-import-source-flag-detail',
  templateUrl: './import-source-flag-detail.component.html',
  styleUrls: ['./import-source-flag-detail.component.scss']
})
export class ImportSourceFlagDetailComponent implements OnChanges {
  @Input() public flagDefinition: FlagDefinition | undefined;
  @Output() public flagDefinitionChange = new EventEmitter<FlagDefinition | undefined>();

  /** True unless the parent has committed to a wide-pivot value source.
   *  Hides the SEPARATE mode option — a separate flag column requires a
   *  separate value column to sit alongside. */
  @Input() public canUseSeparateColumn: boolean = true;

  /**
   * Local, authoritative mode for rendering. Seeded from the @Input values in
   * ngOnChanges so it stays in sync when the parent updates the model, but
   * updated eagerly inside `onModeSelection` so the *ngIf blocks flip on the
   * same tick as the click — no dependency on the emit → parent → change-
   * detection round trip.
   */
  protected mode: FlagMode = FlagMode.NONE;

  /** Exposed to the template so it can reference enum members. */
  protected readonly FlagMode = FlagMode;

  protected modeButtons: { label: FlagMode; checked: boolean }[] = [];

  constructor(private cachedMetadataService: CachedMetadataService) {
    this.rebuildModeButtons();
  }

  ngOnChanges(): void {
    // Reseed local mode from the (possibly-updated) inputs, unless we already
    // have a matching mode set from a click. This handles two cases:
    //   1. Dialog opened with an existing spec — inputs arrive after construction.
    //   2. Parent clears state (e.g. wizard restart) — we mirror the reset.
    const derived: FlagMode = this.deriveModeFromInputs();
    if (derived !== this.mode) {
      this.mode = derived;
    }
    this.rebuildModeButtons();
  }

  protected get defaultFlagId(): number {
    const missingFlag = this.cachedMetadataService.getMissingFlag();
    return missingFlag ? missingFlag.id : 1;
  }

  protected onModeSelection(mode: FlagMode): void {
    this.mode = mode;

    if (mode === FlagMode.SEPARATE) {
      this.flagDefinition = { separateColumn: { flagColumnPosition: 0, flagsToFetch: undefined } };
    } else if (mode === FlagMode.INLINE) {
      this.flagDefinition = { inline: { flagsToFetch: undefined } };
    } else {
      this.flagDefinition = undefined;
    }

    this.rebuildModeButtons();
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected readonly modeLabel = (mode: FlagMode): string => {
    switch (mode) {
      case FlagMode.NONE: return 'No Flag';
      case FlagMode.SEPARATE: return 'Separate Column';
      case FlagMode.INLINE: return 'Inline With Value (e.g. 0.5T)';
    }
  };

  private deriveModeFromInputs(): FlagMode {
    if (this.flagDefinition?.separateColumn) return FlagMode.SEPARATE;
    if (this.flagDefinition?.inline) return FlagMode.INLINE;
    return FlagMode.NONE;
  }

  private rebuildModeButtons(): void {
    const buttons: { label: FlagMode; checked: boolean }[] = [
      { label: FlagMode.NONE, checked: this.mode === FlagMode.NONE },
    ];
    if (this.canUseSeparateColumn) {
      buttons.push({ label: FlagMode.SEPARATE, checked: this.mode === FlagMode.SEPARATE });
    }
    buttons.push({ label: FlagMode.INLINE, checked: this.mode === FlagMode.INLINE });
    this.modeButtons = buttons;
  }

  // ─── Separate-column mode ──────────────────────────────────────────────

  protected onFetchFlagsChange(fetch: boolean): void {
    if (!this.flagDefinition?.separateColumn) return;
    this.flagDefinition.separateColumn.flagsToFetch = fetch ? [] : undefined;
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected onMappingsChange(mappings: IdMapping[]): void {
    if (!this.flagDefinition?.separateColumn) return;
    this.flagDefinition.separateColumn.flagsToFetch = mappings.map(m => ({
      sourceId: m.sourceId,
      databaseId: Number(m.databaseId),
    }));
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  // ─── Inline-flag mode ──────────────────────────────────────────────────

  protected onInlineFetchFlagsChange(fetch: boolean): void {
    if (!this.flagDefinition?.inline) return;
    this.flagDefinition.inline.flagsToFetch = fetch ? [] : undefined;
    this.flagDefinitionChange.emit(this.flagDefinition);
  }

  protected onInlineMappingsChange(mappings: IdMapping[]): void {
    if (!this.flagDefinition?.inline) return;
    this.flagDefinition.inline.flagsToFetch = mappings.map(m => ({
      sourceId: m.sourceId,
      databaseId: Number(m.databaseId),
    }));
    this.flagDefinitionChange.emit(this.flagDefinition);
  }
}
