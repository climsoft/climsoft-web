import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { PageInputDefinition } from './page-input-definition';

@Component({
  selector: 'app-page-input',
  templateUrl: './page-input.component.html',
  styleUrls: ['./page-input.component.scss']
})
export class PageInputComponent implements OnChanges {

  @Input()
  public pageInputDefinition!: PageInputDefinition;

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

  protected closeVisibleRowsDropDown(): void {
    this.displayVisibleRowsDropDown = false;
  }

  protected onDisplayVisibleRowsDropDown(): void {
    this.displayVisibleRowsDropDown = true;
  }

  protected onPageSizeSelection(pageSizeSelection: string): void {
    this.pageInputDefinition.setPageSize(pageSizeSelection === '31' ? 31 : 365)
    this.closeVisibleRowsDropDown();
    this.pageInputDefinitionChange.emit();
  }

}
