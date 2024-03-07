import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model';
import { StationElementsService } from 'src/app/core/services/station-elements.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

export interface MonthLimitSelection extends StationElementLimitModel {
  selected: boolean;
}

@Component({
  selector: 'app-station-element-limits-input-dialog',
  templateUrl: './station-element-limits-input-dialog.component.html',
  styleUrls: ['./station-element-limits-input-dialog.component.scss']
})
export class StationElementLimitsInputDialogComponent {
  @Output() public ok = new EventEmitter<StationElementLimitModel[]>();
  protected mode!: 'EDIT' | 'DELETE';
  protected open: boolean = false;
  private stationId!: string;
  private elementId!: number;
  protected monthLimits!: MonthLimitSelection[];

  constructor(private stationElementsService: StationElementsService) {
  }

  public openDialog(mode: 'EDIT' | 'DELETE', stationId: string, elementId: number): void {

    this.open = true;
    this.mode = mode;
    this.stationId = stationId;
    this.elementId = elementId;

    this.loadLimits();

  }

  private loadLimits(): void {
    this.monthLimits = [];

    this.stationElementsService.getStationElementLimits(this.stationId, this.elementId).subscribe((dbLimits) => {

      if (this.mode === 'EDIT') {

        for (let monthId = 1; monthId <= 12; monthId++) {
          this.monthLimits.push({ monthId: monthId, lowerLimit: null, upperLimit: null, comment: null, selected: false });
        }

        for (let dbMonthLimit of dbLimits) {
          let displayMonthLimit = this.monthLimits.find(limit => (dbMonthLimit.monthId === limit.monthId));
          if (displayMonthLimit) {
            Object.assign<StationElementLimitModel, StationElementLimitModel>(displayMonthLimit, dbMonthLimit);
          }
        }

      } else if (this.mode === 'DELETE') {

        for (let dbMonthLimit of dbLimits) {
          this.monthLimits.push({ ...dbMonthLimit, selected: false });
        }

      }

    });
  }

  protected onOkCancelClick(): void {
    let updatedLimits: MonthLimitSelection[] = [];
    if (this.mode === "EDIT") {
       updatedLimits = this.monthLimits.filter(monthLimit =>
        monthLimit.lowerLimit !== null || monthLimit.upperLimit !== null
      );      

    } else if (this.mode === "DELETE") {
      updatedLimits = this.monthLimits.filter(limit => limit.selected);
    } 

    const newLimits: StationElementLimitModel[]= [];
    for(const limitSlection of updatedLimits){
      const limit: StationElementLimitModel = {...limitSlection}
      newLimits.push(limit);
    }

    this.ok.emit(newLimits);

  }

  protected onLimitClicked(monthLimit: MonthLimitSelection): void {
    // Toggle selection
    monthLimit.selected = !monthLimit.selected;
  }

  protected getMonthName(monthId: number): string {
    return DateUtils.getMonthName(monthId)
  }

  private emitLimts(updatedLimits: MonthLimitSelection[]): void {
  


    //save limits
    // this.stationsService.saveStationElementLimits(this.stationId, this.elementId, updatedMonthLimits).subscribe(data => {
    //   if (data && data.length > 0) {
    //     this.ok.emit();
    //   }
    // });
  }

  private deleteLimits(): void {
   
    // this.stationsService.deleteStationElementLimit(this.stationId, this.elementId, selectedIds).subscribe(data => {
    //   this.loadLimits();
    // });

  }


}
