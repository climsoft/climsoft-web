import { Component, Input } from '@angular/core';
import { ElementAndValueDefinition } from '../../../../core/models/sources/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-element-and-value-detail',
  templateUrl: './import-source-element-and-value-detail.component.html',
  styleUrls: ['./import-source-element-and-value-detail.component.scss']
})
export class ImportSourceElementAndValueDetailComponent {

  @Input()
  public elementAndValueDefinition!: ElementAndValueDefinition ;
  
  protected onElementStatusSelection(elementStatus: string): void {
    this.elementAndValueDefinition.noElement = undefined;
    this.elementAndValueDefinition.hasElement = undefined;
    if (elementStatus === 'Includes Elements') {
      this.elementAndValueDefinition.hasElement = {}
    } else if (elementStatus === 'Does Not Include Elements') {
      this.elementAndValueDefinition.noElement = { databaseId: 0, valueColumnPosition: 0 };
    }

  }

  protected onHasElementSelection(elementStatus: string): void {
    if (!this.elementAndValueDefinition.hasElement) {
      return
    }

    this.elementAndValueDefinition.hasElement.singleColumn = undefined;
    this.elementAndValueDefinition.hasElement.multipleColumn = undefined;

    if (elementStatus === 'Single Column') {
      this.elementAndValueDefinition.hasElement.singleColumn = { elementColumnPosition: 0, valueColumnPosition: 0 }
    } else if (elementStatus === 'Multiple Column') {
      this.elementAndValueDefinition.hasElement.multipleColumn = [{ columnPosition: 0, databaseId: 0 }];
    }
  }

  protected onSingleElementIncludesFlag(include: boolean): void {
    if (this.elementAndValueDefinition.hasElement?.singleColumn) {
      this.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition = include ? 0 : undefined;
    }
  }


  protected onSingleFetchElementsChange(fetch: boolean) {

    if (!this.elementAndValueDefinition.hasElement?.singleColumn) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch = fetch ? [{ sourceId: '', databaseId: 0 }] : undefined;
  }

  protected onSingleElementsToFetchDatabaseIdEntry(index: number): void {

    if (!this.elementAndValueDefinition.hasElement?.singleColumn?.elementsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    if (index === this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch.length - 1) {
      this.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch.push({ sourceId: '', databaseId: 0 });;
    }
  }

  protected onMultipleElementsDatabaseIdEntry(index: number): void {

    if (!this.elementAndValueDefinition.hasElement?.multipleColumn) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    if (index === this.elementAndValueDefinition.hasElement.multipleColumn.length - 1) {
      this.elementAndValueDefinition.hasElement.multipleColumn.push({ columnPosition: 0, databaseId: 0 });;
    }
  }


  protected onNoElementIncludesFlag(include: boolean): void {
    if (this.elementAndValueDefinition.noElement) {
      this.elementAndValueDefinition.noElement.flagColumnPosition = include ? 0 : undefined;
    }
  }

}
