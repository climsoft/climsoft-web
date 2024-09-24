import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { take } from 'rxjs';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { PageInputDefinition } from 'src/app/shared/controls/page-input/page-input-definition';
import { DeleteObservationModel } from 'src/app/core/models/observations/delete-observation.model';
import { Period, PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { ObservationDefinition } from '../../../form-entry/defintions/observation.definition';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
}

@Component({
  selector: 'app-edit-same-observations',
  templateUrl: './edit-same-observations.component.html',
  styleUrls: ['./edit-same-observations.component.scss']
})
export class EditSameObservationsComponent {

  protected totalRecords: number = 0;

  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected period: number | null = null;
  protected elevation: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: ObservationEntry[] = [];
  private elementsMetadata: ViewElementModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private periods: Period[] = PeriodsUtil.possiblePeriods;
  protected pageInputDefinition: PageInputDefinition = new PageInputDefinition();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected numOfChanges: number = 0;

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

  protected loadData(): void {
    this.enableSave = false;
    this.numOfChanges = 0;
    this.observationsEntries = [];
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.observationService.findProcessed(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.enableSave = true;
      this.observationsEntries = data.map(viewObservationModel => {
        const elementMetadata = this.elementsMetadata.find(item => item.id === viewObservationModel.elementId);
        if (!elementMetadata) {
          throw new Error("Developer error: Element not found.");
        }

        const sourceMetadata = this.sourcessMetadata.find(item => item.id === viewObservationModel.sourceId);
        if (!sourceMetadata) {
          throw new Error("Developer error: Source not found.");
        }

        return {
          obsDef: new ObservationDefinition(viewObservationModel, elementMetadata, sourceMetadata.allowMissingValue, false, false),
          newStationId: '',
          newElementId: 0,
          delete: false
        }

      });

    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  
  protected asViewObservationModel(observationsDef: ObservationDefinition): ViewObservationModel {
    return (observationsDef.observation as ViewObservationModel);
  }

  protected getFormattedDatetime(strDateTime: string): string {
    return strDateTime.replace('T', ' ').replace('Z', '');
  }

  protected getPeriodName(minutes: number): string {
    const periodFound = this.periods.find(item => item.id === minutes);
    return periodFound ? periodFound.name : minutes + 'mins';
  }

  protected onViewClick(): void {
    
  }

  protected onPush(): void{

  }

}
