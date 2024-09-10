import { Component } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/core/models/observations/view-observation-query.model';
import { ViewObservationModel } from 'src/app/core/models/observations/view-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ObservationDefinition } from '../form-entry/defintions/observation.definition';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { take } from 'rxjs';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { PageInputDefinition } from 'src/app/shared/controls/page-input/page-input-definition';
import { DeleteObservationModel } from 'src/app/core/models/observations/delete-observation.model';
import { Period, PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';

interface ObservationEntry {
  obsDef: ObservationDefinition;
  delete: boolean;
  newStationId: string;
  newElementId: number;
}

@Component({
  selector: 'app-manage-data',
  templateUrl: './manage-data.component.html',
  styleUrls: ['./manage-data.component.scss']
})
export class ManageDataComponent {

  protected activeTab: 'edit' | 'missing' | 'qc' | 'deleted' = 'edit';

  protected onTabClick(selectedTab: 'edit' | 'missing' | 'qc' | 'deleted' = 'edit'): void {
    this.activeTab = selectedTab;
  }

}
