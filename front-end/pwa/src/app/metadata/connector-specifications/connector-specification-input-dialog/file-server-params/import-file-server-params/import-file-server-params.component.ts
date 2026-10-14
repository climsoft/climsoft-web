import { Component, Input } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { ImportFileServerParametersModel, ImportFileServerSpecificationModel } from '../../../models/create-connector-specification.model';

@Component({
  selector: 'app-import-file-server-params',
  templateUrl: './import-file-server-params.component.html',
  styleUrls: ['./import-file-server-params.component.scss']
})
export class ImportFileServerParamsComponent {

  @Input()
  public importFileServerParameters!: ImportFileServerParametersModel;

  protected importSourceTypeEnum: SourceTypeEnum = SourceTypeEnum.IMPORT;

  /**
   * What the user typed into each binding's Exclude box, kept verbatim.
   *
   * The model holds the parsed list, but the box cannot be bound to that list
   * re-joined: typing "a," would parse to ["a"] and redisplay as "a", eating the
   * comma before the next entry could be typed. So the box shows the raw text
   * and only the model is normalised. Keyed by the binding object, which
   * survives reordering and removal in a way an index would not.
   */
  private excludeText = new WeakMap<ImportFileServerSpecificationModel, string>();

  protected onAddSpecification(): void {
    if (!this.importFileServerParameters.specifications) {
      this.importFileServerParameters.specifications = [];
    }
    this.importFileServerParameters.specifications.push({
      filePattern: '',
      excludePatterns: [],
      specificationId: 0,
      stationId: null,
      disabled: false
    });
  }

  protected onRemoveSpecification(index: number): void {
    this.importFileServerParameters.specifications.splice(index, 1);
  }

  /**
   * Reorder the bindings by dragging.
   *
   * The order is not cosmetic: `syncBindings` stores each binding's position as
   * its `sort_order`, and every read — the cache the import processor works
   * from included — comes back ordered by it. So this decides the order the
   * connector lists and imports its patterns in, and it persists on save.
   *
   * Moving a row keeps the binding OBJECT, so its `id` travels with it and its
   * run history and de-duplication ledger stay attached. Nothing is re-imported
   * because of a reorder. The raw Exclude text follows too — `excludeText` is
   * keyed by the object, not by the index.
   */
  protected onDragDrop(event: CdkDragDrop<ImportFileServerSpecificationModel[]>): void {
    moveItemInArray(this.importFileServerParameters.specifications, event.previousIndex, event.currentIndex);
  }

  protected getStationId(index: number): string | null {
    const stationId = this.importFileServerParameters.specifications[index].stationId;
    return stationId ?? null;
  }

  protected onStationIdChange(index: number, stationId: string): void {
    this.importFileServerParameters.specifications[index].stationId = stationId || null;
  }

  protected onSpecificationIdChange(index: number, specificationId: number | null): void {
    this.importFileServerParameters.specifications[index].specificationId = specificationId ?? 0;
  }

  /**
   * Switch one binding off, leaving the connector's others running. Takes effect
   * on save like every other field on this form — the connector is authored as
   * one document, so there is no separate call here.
   *
   * Disabling rather than deleting is what keeps the binding's identity, and
   * with it the de-duplication ledger: re-enabling re-reads only files that are
   * genuinely new or changed, where a delete-and-re-add would import every file
   * it ever saw all over again.
   */
  protected onToggleDisabled(index: number): void {
    const spec = this.importFileServerParameters.specifications[index];
    spec.disabled = !spec.disabled;
  }

  protected getExcludeText(index: number): string {
    const spec = this.importFileServerParameters.specifications[index];
    return this.excludeText.get(spec) ?? (spec.excludePatterns ?? []).join(', ');
  }

  /**
   * Comma-separated globs to a list. Blank entries — a trailing or doubled
   * comma — are dropped here and again by the API, so neither is an error.
   */
  protected onExcludeTextChange(index: number, text: string): void {
    const spec = this.importFileServerParameters.specifications[index];
    this.excludeText.set(spec, text);
    spec.excludePatterns = text.split(',').map(entry => entry.trim()).filter(entry => entry !== '');
  }

  protected isDisabled(index: number): boolean {
    return this.importFileServerParameters.specifications[index].disabled === true;
  }
}
