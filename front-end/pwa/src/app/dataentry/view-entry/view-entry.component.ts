import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationDefinition } from '../form-entry/defintions/observation.definition';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { take } from 'rxjs';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { PageInputDefinition } from 'src/app/shared/controls/page-input/page-input-definition';


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
  protected useEntryDate: boolean = false;
  protected observationsDefs: ObservationDefinition[] = [];
  private elementsMetadata: ViewElementModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];

  protected pageInputDefinition: PageInputDefinition = new PageInputDefinition();
  protected enableSave: boolean = false;

  private observationFilter!: ViewObservationQueryModel;

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsService,
    private sourcesService: SourcesService,
    private observationService: ObservationsService
  ) {
    this.pagesDataService.setPageHeader('Manage Data');

    this.elementService.findAll().pipe(take(1)).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.findAll().pipe(take(1)).subscribe(data => {
      this.sourcessMetadata = data;
    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected refresh(): void {
    // Get the data based on the selection filter
    this.observationFilter = {};

    if (this.stationId) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.sourceId) {
      this.observationFilter.sourceIds = [this.sourceId];
    }

    if (this.elementId) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.period) {
      this.observationFilter.period = this.period;
    }

    // TODO. Investigate. If this is set to false, the dto is sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    if (this.fromDate) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsDefs = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.observationService.count(this.observationFilter).pipe(take(1)).subscribe(count => {
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadData();
      }
    });

  } 

  protected loadData(): void {
    this.observationsDefs = [];
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findProcessed(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.enableSave = true;
      this.observationsDefs = data.map(viewObservationModel => {
        const elementMetadata = this.elementsMetadata.find(item => item.id === viewObservationModel.elementId);
        if (!elementMetadata) {
          throw new Error("Developer error: Element not found.");
        }

        const sourceMetadata = this.sourcessMetadata.find(item => item.id === viewObservationModel.sourceId);
        if (!sourceMetadata) {
          throw new Error("Developer error: Source not found.");
        }

        return new ObservationDefinition(viewObservationModel, elementMetadata, sourceMetadata.allowMissingValue, false, false);
      });
      
    });
  }


  protected asViewObservationModel(observationsDef: ObservationDefinition): ViewObservationModel {
    return (observationsDef.observation as ViewObservationModel);
  }

  protected getFormattedDatetime(strDateTime: string): string {
    return strDateTime.replace('T', ' ').replace('Z', '');
  }


  protected onSave(): void {
    this.enableSave = false;
    // Create required observation dtos 
    const newObservations: CreateObservationModel[] = this.observationsDefs.filter(item => item.observationChanged).map(item => {
      // Important. Explicitly convert the view model to create model
      const viewModel = item.observation as ViewObservationModel;
      return {
        stationId: viewModel.stationId,
        elementId: viewModel.elementId,
        sourceId: viewModel.sourceId,
        elevation: viewModel.elevation,
        datetime: viewModel.datetime,
        period: viewModel.period,
        value: viewModel.value,
        flag: viewModel.flag,
        comment: viewModel.comment
      };
    });

    if (newObservations.length === 0) {
      this.pagesDataService.showToast({ title: 'Observations', message: `No changes made`, type: 'info' });
      return;
    }

    // Send to server for saving
    this.observationService.save(newObservations).subscribe((data) => {
      this.enableSave = true;
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${newObservations.length} observation${newObservations.length === 1 ? '' : 's'} saved`, type: 'success'
        });

        this.refresh();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${newObservations.length} observation${newObservations.length === 1 ? '' : 's'} NOT saved`, type: 'error'
        });
      }
    });
  }

}
