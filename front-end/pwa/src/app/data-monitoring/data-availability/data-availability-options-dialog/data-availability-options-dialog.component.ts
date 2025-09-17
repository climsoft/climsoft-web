import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-data-availability-options-dialog',
  templateUrl: './data-availability-options-dialog.component.html',
  styleUrls: ['./data-availability-options-dialog.component.scss']
})
export class DataAvailabilityOptionsDialogComponent implements OnDestroy {
  @Input() open: boolean = false; 
  @Output() public optionClick = new EventEmitter<'view_data' | 'drill_down'>()
  
  protected showViewData: boolean = false;
  protected showDrillDown: boolean = false;

  private destroy$ = new Subject<void>();

  constructor() {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public showDialog(showViewData: boolean, showDrillDown: boolean, label: 'row'|'column'): void {
    this.open = true;
    this.showViewData = showViewData;
    this.showDrillDown = showDrillDown;
  }

  protected onOptionClick(optionClicked: 'view_data' | 'drill_down'): void {
    this.open = false;
    this.optionClick.emit(optionClicked);
  }

}
