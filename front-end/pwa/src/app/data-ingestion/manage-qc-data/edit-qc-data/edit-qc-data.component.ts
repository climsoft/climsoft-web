import { Component } from '@angular/core';
import { take } from 'rxjs'; 
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model'; 
import { PagesDataService } from 'src/app/core/services/pages-data.service'; 
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { Interval, IntervalsUtil } from 'src/app/shared/controls/period-input/period-single-input/Intervals.util'; 
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { ObservationDefinition } from '../../form-entry/defintitions/observation.definition';
import { ObservationsService } from '../../services/observations.service';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
}

@Component({
  selector: 'app-edit-qc-data',
  templateUrl: './edit-qc-data.component.html',
  styleUrls: ['./edit-qc-data.component.scss']
})
export class EditQCDataComponent {

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
  private elementsMetadata: CreateViewElementModel[] = [];
  private sourcessMetadata: ViewSourceModel[] = [];
  private periods: Interval[] = IntervalsUtil.possibleIntervals;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableSave: boolean = false;
  protected numOfChanges: number = 0;

  constructor(
    private pagesDataService: PagesDataService,
    private elementService: ElementsCacheService,
    private sourcesService: SourceTemplatesCacheService,
    private observationService: ObservationsService
  ) {
    this.pagesDataService.setPageHeader('Manage Data');

    this.elementService.cachedElements.pipe(take(1)).subscribe(data => {
      this.elementsMetadata = data;
    });

    this.sourcesService.cachedSources.pipe(take(1)).subscribe(data => {
      this.sourcessMetadata = data;
    });
  }


  protected onViewClick(): void {
    
  }

}
