import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ElementAndValueDefinition } from '../../models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-element-and-value-detail',
  templateUrl: './import-source-element-and-value-detail.component.html',
  styleUrls: ['./import-source-element-and-value-detail.component.scss']
})
export class ImportSourceElementAndValueDetailComponent implements OnChanges {

  @Input()
  public elementAndValueDefinition!: ElementAndValueDefinition;

  protected elementColumnsHolder!: { columnPosition: number, databaseId: number }[];
  protected elementToFetchsHolder!: { sourceId: string, databaseId: number }[];

  ngOnChanges(changes: SimpleChanges): void {
    if (this.elementAndValueDefinition && this.elementAndValueDefinition.hasElement) {
      if (this.elementAndValueDefinition.hasElement.multipleColumn) {
        this.elementColumnsHolder = [... this.elementAndValueDefinition.hasElement.multipleColumn];
        //Add new placholder values
        this.elementColumnsHolder.push({ columnPosition: 0, databaseId: 0 });
      }

      if (this.elementAndValueDefinition.hasElement.singleColumn?.elementsToFetch) {
        this.elementToFetchsHolder = [... this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch];
        //Add new placholder values
        this.elementToFetchsHolder.push({ sourceId: '', databaseId: 0 });
      }


    }
  }

  protected onElementStatusSelection(elementSelectionStatus: string): void {
    this.elementAndValueDefinition.noElement = undefined;
    this.elementAndValueDefinition.hasElement = undefined;
    if (elementSelectionStatus === 'Includes Elements') {
      this.elementAndValueDefinition.hasElement = {}
    } else if (elementSelectionStatus === 'Does Not Include Elements') {
      this.elementAndValueDefinition.noElement = { databaseId: 0, valueColumnPosition: 0 };
    }

  }

  protected onElementColumnsSelection(elementColumnStatus: string): void {
    if (!this.elementAndValueDefinition.hasElement) {
      return
    }

    this.elementAndValueDefinition.hasElement.singleColumn = undefined;
    this.elementAndValueDefinition.hasElement.multipleColumn = undefined;
    this.elementColumnsHolder = [{ columnPosition: 0, databaseId: 0 }];

    if (elementColumnStatus === 'In Single Column') {
      this.elementAndValueDefinition.hasElement.singleColumn = { elementColumnPosition: 0, valueColumnPosition: 0 };
    } else if (elementColumnStatus === 'In Multiple Columns') {
      this.elementAndValueDefinition.hasElement.multipleColumn = [];
    }
  }

  protected onSingleFetchElementsChange(fetch: boolean) {

    if (!this.elementAndValueDefinition.hasElement?.singleColumn) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch = fetch ? [] : undefined;

    this.elementToFetchsHolder = [{ sourceId: '', databaseId: 0 }];
  }

  protected onSingleElementsToFetchEntry(): void {

    if (!this.elementAndValueDefinition.hasElement?.singleColumn?.elementsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.elementToFetchsHolder[this.elementToFetchsHolder.length - 1];
    if (last.sourceId !== '' && last.databaseId !== 0) {

      // Set the new valid values
      this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch = [...this.elementToFetchsHolder];

      //Add new placholder values
      this.elementToFetchsHolder.push({ sourceId: '', databaseId: 0 });
    }
  }

  protected onMultipleElementsEntry(): void {

    if (!this.elementAndValueDefinition.hasElement?.multipleColumn) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.elementColumnsHolder[this.elementColumnsHolder.length - 1];
    if (last.columnPosition !== 0 && last.databaseId !== 0) {

      // Set the new valid values from the place holder
      //this.elementColumnsHolder = this.elementColumnsHolder.filter( item => item.columnPosition !== 0);
      this.elementAndValueDefinition.hasElement.multipleColumn = [...this.elementColumnsHolder];

      //Add new placholder values
      this.elementColumnsHolder.push({ columnPosition: 0, databaseId: 0 });
    }

  }

}
