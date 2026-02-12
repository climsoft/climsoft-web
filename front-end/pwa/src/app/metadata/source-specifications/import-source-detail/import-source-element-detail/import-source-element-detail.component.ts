import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ElementDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-element-detail',
  templateUrl: './import-source-element-detail.component.html',
  styleUrls: ['./import-source-element-detail.component.scss']
})
export class ImportSourceElementDetailComponent implements OnChanges {
  @Input() public elementDefinition!: ElementDefinition;
  @Output() public elementDefinitionChange = new EventEmitter<ElementDefinition>();

  protected elementColumnsHolder!: { columnPosition: number, databaseId: number }[];
  protected elementToFetchsHolder!: { sourceId: string, databaseId: number }[];

  ngOnChanges(changes: SimpleChanges): void {
    if (this.elementDefinition && this.elementDefinition.hasElement) {
      if (this.elementDefinition.hasElement.multipleColumn) {
        this.elementColumnsHolder = [... this.elementDefinition.hasElement.multipleColumn];
        //Add new placholder values
        this.elementColumnsHolder.push({ columnPosition: 0, databaseId: 0 });
      }

      if (this.elementDefinition.hasElement.singleColumn?.elementsToFetch) {
        this.elementToFetchsHolder = [... this.elementDefinition.hasElement.singleColumn.elementsToFetch];
        //Add new placholder values
        this.elementToFetchsHolder.push({ sourceId: '', databaseId: 0 });
      }
    }
  }

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
    this.elementColumnsHolder = [{ columnPosition: 0, databaseId: 0 }];

    if (elementColumnStatus === 'In Single Column') {
      this.elementDefinition.hasElement.singleColumn = { elementColumnPosition: 0 };
    } else if (elementColumnStatus === 'In Multiple Columns') {
      this.elementDefinition.hasElement.multipleColumn = [];
    }

    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onSingleFetchElementsChange(fetch: boolean) {

    if (!this.elementDefinition.hasElement?.singleColumn) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.elementDefinition.hasElement.singleColumn.elementsToFetch = fetch ? [] : undefined;

    this.elementToFetchsHolder = [{ sourceId: '', databaseId: 0 }];
  }

  protected onSingleElementsToFetchEntry(): void {

    if (!this.elementDefinition.hasElement?.singleColumn?.elementsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.elementToFetchsHolder[this.elementToFetchsHolder.length - 1];
    if (last.sourceId !== '' && last.databaseId !== 0) {

      // Set the new valid values
      this.elementDefinition.hasElement.singleColumn.elementsToFetch = [...this.elementToFetchsHolder];

      //Add new placholder values
      this.elementToFetchsHolder.push({ sourceId: '', databaseId: 0 });
    }

    this.elementDefinitionChange.emit(this.elementDefinition);
  }

  protected onMultipleElementsEntry(): void {

    if (!this.elementDefinition.hasElement?.multipleColumn) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.elementColumnsHolder[this.elementColumnsHolder.length - 1];
    if (last.columnPosition !== 0 && last.databaseId !== 0) {

      // Set the new valid values from the place holder
      //this.elementColumnsHolder = this.elementColumnsHolder.filter( item => item.columnPosition !== 0);
      this.elementDefinition.hasElement.multipleColumn = [...this.elementColumnsHolder];

      //Add new placholder values
      this.elementColumnsHolder.push({ columnPosition: 0, databaseId: 0 });
    }

    this.elementDefinitionChange.emit(this.elementDefinition);

  }

}
