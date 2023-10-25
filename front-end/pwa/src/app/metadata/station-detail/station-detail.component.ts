import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model';
import { StationElementModel } from 'src/app/core/models/station-element.model';
import { StationFormModel } from 'src/app/core/models/station-form.model';
import { StationModel } from 'src/app/core/models/station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

  station!: StationModel;
  elements!: StationElementModel[];
  elementLimits!: StationElementLimitModel[];
  forms!: StationFormModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {

    const stationId = this.route.snapshot.params['stationid'];

    this.stationsService.getStation(stationId).subscribe((data) => {
      this.station = data;
    });

  }

  //------ elements -----
  loadElements(): void {
    this.stationsService.getStationElements(this.station.id).subscribe((data) => {
      this.elements = data;
    });
  }

  getElementIdsToExclude(): number[] {
    return this.elements.map(element => element.elementId) ?? [];
  }

  onElementsSelected(selectedIds: number[]): void {
    this.stationsService.saveStationElements(this.station.id, selectedIds).subscribe((data) => {
      if (data.length > 0) {
        this.pagesDataService.showToast({ title: 'Station Element', message: 'Elements Added', type: 'success' });
      }
      this.loadElements();
    });
  }

  onElementDeleted(elementId: string): void {
    this.stationsService.deleteStationElement(this.station.id, Number(elementId)).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: 'Station Element', message: 'Element Deleted', type: 'success' });
      }
      this.loadElements();
    });
  }
  //-------------------

  //------element limits----

  getMonthName(monthId: number): string{
    return DateUtils.getMonthName(monthId);
  }

  loadElementLimits(): void {
    this.stationsService.getStationElementLimits(this.station.id).subscribe((data) => {
      this.elementLimits = data;
    });
  }


  //-------------------

  //-------forms------------
  loadForms(): void {
    this.stationsService.getStationForms(this.station.id).subscribe((data) => {
      this.forms = data;
    });
  }

  getFormIds(): number[] {
    return this.forms.map(form => form.sourceId) ?? [];
  }

  onFormsSelected(selectedIds: number[]): void {
    this.stationsService.saveStationForms(this.station.id, selectedIds).subscribe((data) => {
      if (data.length > 0) {
        this.pagesDataService.showToast({ title: 'Station Entry Form', message: 'Entry Form Added', type: 'success' });
      }
      this.loadForms();
    });
  }

  onFormDeleted(formId: string): void {
    this.stationsService.deleteStationForm(this.station.id, Number(formId)).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: 'Station Form', message: 'Form Deleted', type: 'success' });
      }
      this.loadForms();
    });
  }
  //-------------------

  onSaveClick(): void {

  }

  onCancelClick(): void {

  }







}
