import { Component } from '@angular/core';
import { ViewObservationModel } from 'src/app/core/models/view-observation.model';
import { SelectObservation } from 'src/app/core/models/dtos/select-observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewObservationDto } from 'src/app/core/models/dtos/view-observation.model';

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
  protected observations: ViewObservationDto[] = [];

  constructor(private pagesDataService: PagesDataService, private observationService: ObservationsService,) {
    this.pagesDataService.setPageHeader('View Entries');
  }

  protected onViewClick(): void {

    //get the data based on the selection filter
    const observationFilter: SelectObservation = {};

    if (this.stationId) {
      observationFilter.stationId = this.stationId;
    }

    if (this.sourceId) {
      observationFilter.sourceId = this.sourceId;
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

    if (this.hour !== undefined && this.hour !== null) {
      observationFilter.hours = [this.hour];
    }

    this.observationService.getObservations(observationFilter).subscribe((data) => {
      this.observations = data;
    });

  }

  protected onObservationClick(observation: ViewObservationDto): void{

  }

}
