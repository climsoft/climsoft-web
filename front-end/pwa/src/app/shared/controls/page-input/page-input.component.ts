import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { PagingParameters } from './paging-parameters';

@Component({
  selector: 'app-page-input',
  templateUrl: './page-input.component.html',
  styleUrls: ['./page-input.component.scss']
})
export class PageInputComponent implements OnChanges {

  @Input()
  public pageInputDefinition!: PagingParameters;

  @Output()
  public pageInputDefinitionChange = new EventEmitter<void>();

  protected displayVisibleRowsDropDown: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {

  }

  protected onFirst(): void {
    if (this.pageInputDefinition.onFirst()) {
      this.pageInputDefinitionChange.emit();
    }
  }

  protected onPrevious(): void {
    if (this.pageInputDefinition.onPrevious()) {
      this.pageInputDefinitionChange.emit();
    }
  }

  protected onNext(): void {
    if (this.pageInputDefinition.onNext()) {
      this.pageInputDefinitionChange.emit();
    }

  }

  protected onLast(): void {
    if (this.pageInputDefinition.onLast()) {
      this.pageInputDefinitionChange.emit();
    }
  }

  protected get firstRecord(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize + 1;
  }

  protected get lastRecord(): number {
    return Math.min(this.pageInputDefinition.page * this.pageInputDefinition.pageSize, this.pageInputDefinition.totalRowCount);
  }

  protected closeVisibleRowsDropDown(): void {
    this.displayVisibleRowsDropDown = false;
  }

  protected onDisplayVisibleRowsDropDown(): void {
    this.displayVisibleRowsDropDown = true;
  }

  protected onPageSizeSelection(pageSizeSelection: string): void {
    this.pageInputDefinition.setPageSize(Number(pageSizeSelection))
    this.closeVisibleRowsDropDown();
    this.pageInputDefinitionChange.emit();
  }

}
