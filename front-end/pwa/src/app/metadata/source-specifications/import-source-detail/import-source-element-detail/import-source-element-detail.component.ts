import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-element-detail',
  templateUrl: './import-source-element-detail.component.html',
  styleUrls: ['./import-source-element-detail.component.scss']
})
export class ImportSourceElementDetailComponent {
  @Input() public elementDefinition!: ElementDefinition;
  @Output() public elementDefinitionChange = new EventEmitter<ElementDefinition>();

  protected onElementStatusSelection(elementSelectionStatus: string): void {
    this.elementDefinition.noElement = undefined;
    this.elementDefinition.hasElement = undefined;
    if (elementSelectionStatus === 'Includes Elements') {
      this.elementDefinition.hasElement = {}
    } else if (elementSelectionStatus === 'Does Not Include Elements') {
      this.elementDefinition.noElement = { databaseId: 0 };
    }
  }

  protected onElementColumnsSelection(elementColumnStatus: string): void {
    if (!this.elementDefinition.hasElement) {
      return
    }

    this.elementDefinition.hasElement.singleColumn = undefined;
    this.elementDefinition.hasElement.multipleColumn = undefined;

    if (elementColumnStatus === 'In Single Column') {
      this.elementDefinition.hasElement.singleColumn = { elementColumnPosition: 0 };
    } else if (elementColumnStatus === 'In Multiple Columns') {
      this.elementDefinition.hasElement.multipleColumn = [];
    }

    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onSingleFetchElementsChange(fetch: boolean): void {
    if (!this.elementDefinition.hasElement?.singleColumn) {
      return;
    }
    this.elementDefinition.hasElement.singleColumn.elementsToFetch = fetch ? [] : undefined;
  }

  protected onAddSingleElementMapping(): void {
    this.elementDefinition.hasElement?.singleColumn?.elementsToFetch?.push({ sourceId: '', databaseId: 0 });
  }

  protected onRemoveSingleElementMapping(index: number): void {
    this.elementDefinition.hasElement?.singleColumn?.elementsToFetch?.splice(index, 1);
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onAddMultipleElementMapping(): void {
    this.elementDefinition.hasElement?.multipleColumn?.push({ columnPosition: 0, databaseId: 0 });
  }

  protected onRemoveMultipleElementMapping(index: number): void {
    this.elementDefinition.hasElement?.multipleColumn?.splice(index, 1);
    this.elementDefinitionChange.emit(this.elementDefinition);
  }

}
