import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StationElementModel } from 'src/app/core/models/station-element.model';
import { StationFormModel } from 'src/app/core/models/station-form.model';
import { StationModel } from 'src/app/core/models/station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

  station!: StationModel;
  elements!: StationElementModel[];
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
        this.pagesDataService.showToast({ title: 'Station Element', message: 'Element Added', type: 'success' });
      }
      this.loadElements();
    });
  }

  onElementDeleted(elementId: string): void {
    const elementIds: number[] = [Number(elementId)];
    this.stationsService.deleteStationElements(this.station.id, elementIds).subscribe((data) => {
      if (data.length > 0) {
        this.pagesDataService.showToast({ title: 'Station Element', message: 'Element Deleted', type: 'success' });
      }
      this.loadElements();
    });
  }

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
    const formIds: number[] = [Number(formId)];
    this.stationsService.deleteStationForms(this.station.id, formIds).subscribe((data) => {
      if (data.length > 0) {
        this.pagesDataService.showToast({ title: 'Station Form', message: 'Form Deleted', type: 'success' });
      }
      this.loadForms();
    });
  }

  onSaveClick(): void {

  }

  onCancelClick(): void {

  }







}
