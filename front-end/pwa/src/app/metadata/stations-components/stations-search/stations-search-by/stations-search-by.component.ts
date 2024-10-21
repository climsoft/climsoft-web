import { Component, Output, EventEmitter } from '@angular/core';
import { ComponentIdType } from '../stations-search.component';

@Component({
  selector: 'app-stations-search-by',
  templateUrl: './stations-search-by.component.html',
  styleUrls: ['./stations-search-by.component.scss']
})
export class StationsSearchByComponent {

  @Output()
  public componentIdSelectionChange = new EventEmitter<ComponentIdType>();

  constructor() {

  }


  protected onShowComponent(componentId: ComponentIdType): void {
    this.componentIdSelectionChange.emit(componentId); 
  }






}
