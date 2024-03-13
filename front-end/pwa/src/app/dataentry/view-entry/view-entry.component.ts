import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';


@Component({
  selector: 'app-view-entry',
  templateUrl: './view-entry.component.html',
  styleUrls: ['./view-entry.component.scss']
})
export class ViewEntryComponent {

  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected period: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected observations: ViewObservationModel[] = [];

  constructor(private pagesDataService: PagesDataService, private observationService: ObservationsService,) {
    this.pagesDataService.setPageHeader('View Entries');
  }

  protected onViewClick(): void {

    //get the data based on the selection filter
    const observationFilter: ViewObservationQueryModel = {};

    if (this.stationId) {
      observationFilter.stationIds = [this.stationId];
    }

    if (this.sourceId) {
      observationFilter.sourceIds = [this.sourceId];
    }

    if (this.elementId) {
      observationFilter.elementIds = [this.elementId];
    }


    if (this.period) {
      observationFilter.period = this.period;
    }


    if (this.fromDate) {
      observationFilter.fromDate = this.fromDate;
    }

    if (this.toDate) {
      observationFilter.toDate = this.toDate;
    }

    this.observationService.getObservations(observationFilter).subscribe((data) => {
      this.observations = data.map(item => {
        item.datetime = DateUtils.getDateInSQLFormatFromDate(new Date(item.datetime));
        return item;
      });
    });

  }

  protected onObservationClick(observation: ViewObservationModel): void {

  }

}
