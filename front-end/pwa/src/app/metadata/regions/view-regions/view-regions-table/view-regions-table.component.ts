import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ViewRegionModel } from 'src/app/metadata/regions/models/view-region.model';

@Component({
  selector: 'app-view-regions-table',
  templateUrl: './view-regions-table.component.html',
  styleUrls: ['./view-regions-table.component.scss']
})
export class ViewRegionsTableComponent implements OnChanges {
  @Input()
  public regions!: ViewRegionModel[];

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
  }


}
