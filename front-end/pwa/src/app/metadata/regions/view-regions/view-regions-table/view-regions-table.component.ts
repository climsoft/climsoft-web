import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ViewRegionsDefinition } from '../../view-regions.definition';

@Component({
  selector: 'app-view-regions-table',
  templateUrl: './view-regions-table.component.html',
  styleUrls: ['./view-regions-table.component.scss']
})
export class ViewRegionsTableComponent implements OnChanges {
  @Input()
  public regionsDef!: ViewRegionsDefinition;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
  }

  protected refreshData(): void {
    this.regionsDef.countEntries();
  }

  protected loadEntries(): void{
    this.regionsDef.loadEntries();
  }

  protected get firstRowNum(): number {
    return (this.regionsDef.pageInputDefinition.page - 1) * this.regionsDef.pageInputDefinition.pageSize;
  }

}
