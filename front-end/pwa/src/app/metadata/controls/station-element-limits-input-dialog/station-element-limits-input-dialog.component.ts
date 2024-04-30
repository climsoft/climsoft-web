import { Component, Output, EventEmitter, Input } from '@angular/core';
import { StationElementLimitModel } from 'src/app/core/models/stations/station-element-limit.model';
import { StationElementsService } from 'src/app/core/services/stations/station-elements.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-station-element-limits-input-dialog',
  templateUrl: './station-element-limits-input-dialog.component.html',
  styleUrls: ['./station-element-limits-input-dialog.component.scss']
})
export class StationElementLimitsInputDialogComponent {
  @Input() public title: string = "Set Monthly Limits";
  @Output() public ok = new EventEmitter<StationElementLimitModel[]>();
  protected open: boolean = false;
  private stationId!: string;
  private elementId!: number;
  protected monthLimits!: StationElementLimitModel[];

  constructor(private stationElementsService: StationElementsService) { }

  public openDialog(stationId: string, elementId: number): void {
    this.open = true;
    this.stationId = stationId;
    this.elementId = elementId;
    this.loadLimits();
  }

  private loadLimits(): void {
    this.monthLimits = [];
    this.stationElementsService.getStationElementLimits(this.stationId, this.elementId).subscribe((dbLimits) => {
      // Set all months
      for (let monthId = 1; monthId <= 12; monthId++) {
        this.monthLimits.push({ monthId: monthId, lowerLimit: null, upperLimit: null, comment: null });
      }

      // Set the database limit values that exist
      for (const dbMonthLimit of dbLimits) {
        let displayMonthLimit = this.monthLimits.find(limit => (dbMonthLimit.monthId === limit.monthId));
        if (displayMonthLimit) {
          Object.assign<StationElementLimitModel, StationElementLimitModel>(displayMonthLimit, dbMonthLimit);
        }
      }

    });
  }

  protected onOkCancelClick(): void {
    this.ok.emit(this.monthLimits);
  }


  protected onDeleteAll(): void {
    for (const limit of this.monthLimits) {
      limit.lowerLimit = null;
      limit.upperLimit = null;
    }

  }

  protected getMonthName(monthId: number): string {
    return DateUtils.getMonthName(monthId)
  }

}
