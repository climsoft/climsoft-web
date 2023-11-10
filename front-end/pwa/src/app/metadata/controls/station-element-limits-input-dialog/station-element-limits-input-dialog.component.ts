import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model';
import { StationsService } from 'src/app/core/services/stations.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-station-element-limits-input-dialog',
  templateUrl: './station-element-limits-input-dialog.component.html',
  styleUrls: ['./station-element-limits-input-dialog.component.scss']
})
export class StationElementLimitsInputDialogComponent {
  @Output() ok = new EventEmitter();
  mode!: 'EDIT' | 'DELETE';
  open: boolean = false;
  allMonthLimits!: StationElementLimitModel[];
  private stationId!: string;
  private elementId!: number;
  okButtonLabel!: string;
  cancelButtonLabel!: string;

  constructor(private stationsService: StationsService) {
  }

  openDialog(mode: 'EDIT' | 'DELETE', stationId: string, elementId: number): void {

    this.open = true;
    this.mode = mode;
    this.stationId = stationId;
    this.elementId = elementId;

    if (this.mode === 'EDIT') {
      this.okButtonLabel = 'Save';
      this.cancelButtonLabel = 'Cancel';
    } else {
      this.okButtonLabel = '';
      this.cancelButtonLabel = 'Close';
    }


    this.loadLimits();

  }

  private loadLimits(): void {
    this.stationsService.getStationElementLimits(this.stationId, this.elementId).subscribe((data) => {
      if (this.mode === 'EDIT') {

        this.allMonthLimits = [];

        for (let i = 1; i <= 12; i++) {
          this.allMonthLimits.push({ monthId: i, lowerLimit: null, upperLimit: null, comment: null, log: null, entryUserId: '', entryDateTime: '' });
        }

        for (let dbMonthLimit of data) {
          let displayMonthLimit = this.allMonthLimits.find(limit => (dbMonthLimit.monthId === limit.monthId))
          if (displayMonthLimit) {
            Object.assign<StationElementLimitModel, StationElementLimitModel>(displayMonthLimit, dbMonthLimit)
          }
        }

      } else {
        this.allMonthLimits = data;
      }

    });
  }

  onOkClick(): void {

    const updatedMonthLimits: StationElementLimitModel[] = this.allMonthLimits.filter(monthLimit =>
      monthLimit.lowerLimit !== null || monthLimit.upperLimit !== null
    );

    //save limits
    this.stationsService.saveStationElementLimits(this.stationId, this.elementId, updatedMonthLimits).subscribe(data => {
      if (data.length > 0) {
        this.ok.emit();
      }
    });

  }


  getMonthName(monthId: number): string {
    return DateUtils.getMonthName(monthId)
  }

  deleteLimit(limit: StationElementLimitModel): void {
    this.stationsService.deleteStationElementLimit(this.stationId, this.elementId, limit.monthId).subscribe(data => {
      this.loadLimits();
    });

  }


}
