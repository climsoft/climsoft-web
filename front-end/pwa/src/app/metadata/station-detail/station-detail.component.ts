import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError, finalize } from 'rxjs/operators';
import { ElementModel } from 'src/app/core/models/element.model';
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model'; 
import { StationFormModel } from 'src/app/core/models/station-form.model';
import { StationModel } from 'src/app/core/models/station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationElementsService } from 'src/app/core/services/station-elements.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

  station!: StationModel;
  elements!: ElementModel[];
  elementLimits!: StationElementLimitModel[];
  forms!: StationFormModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private router: Router,
    private stationsService: StationsService,
    private stationElementsService: StationElementsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {

    const stationId = this.route.snapshot.params['id'];

    this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
      this.station = data;
    });

  }

  protected onEditCharacteristics(): void {
    this.router.navigate(["station-characteristics", this.station.id], { relativeTo: this.route.parent });
  }

  //------ elements -----
  protected loadElements(): void {
    this.stationElementsService.getStationElements(this.station.id).subscribe((data) => {
      this.elements = data;
    });
  }


  protected get elementIds(): number[] {
    return this.elements.map(element => element.id) ?? [];
  }


  protected onElementsEdited(selectedIds: number[]): void {

    let addedElementIds: number[] = selectedIds;
    let removeElementIds: number[] = [];

    if (this.elements && this.elements.length > 0) {      
      const existingElementIds = this.elements.map(element => element.id);
      //filter existing element ids 
      addedElementIds = selectedIds.filter(id=> !existingElementIds.includes(id));

      //get existing element ids that have been removed 
      removeElementIds = existingElementIds.filter(id => !selectedIds.includes(id));
    }

    // Use RxJS to optimize simultaneous operations
    if (addedElementIds.length > 0) {
      this.updateStationElements(addedElementIds, 'ADD')
        .pipe(
          // Ensure delete operation starts only after add operation completes
          switchMap(() => removeElementIds.length > 0 ? this.updateStationElements(removeElementIds, 'DELETE') : of(null)),
          // Handle both operations completion
          finalize(() => this.loadElements())
        )
        .subscribe({
          // You could handle errors here if needed
        });
    } else if (removeElementIds.length > 0) {
      this.updateStationElements(removeElementIds, 'DELETE').pipe(finalize(() => this.loadElements())).subscribe();
    }
  }

  private updateStationElements(elementIds: number[], action: 'ADD' | 'DELETE'): Observable<number[] | null> {
    if (elementIds.length === 0) {
      // Immediately complete if no elements to process
      return of(null);
    }

    const operation = action === 'ADD'
      ? this.stationElementsService.saveStationElements(this.station.id, elementIds)
      : this.stationElementsService.deleteStationElements(this.station.id, elementIds);

    return operation.pipe(
      tap(data => {      
        if (data.length > 0) {
          const message: string = action === "ADD" ? "Elements Added" : "Elements Deleted";
          this.pagesDataService.showToast({ title: "Station Element", message: message, type: "success" });
        }
      }),
      catchError(error => {
        // TODO. Handle the error appropriately
        console.error(error);
        return of(null); // or throw an observable error if you want to stop the chain
      })
    );
  }


  //-------------------

  //------element limits----

  loadElementLimits(elementId: number): void {
    this.stationElementsService.getStationElementLimits(this.station.id, elementId).subscribe((data) => {
      this.elementLimits = data;
    });
  }

  getMonthName(monthId: number): string {
    return DateUtils.getMonthName(monthId)
  }

  protected onElementLimitsEdited(elementId: number, elementLimits: StationElementLimitModel[]): void {

    //save limits. Server will handle deletions
    this.stationElementsService.saveStationElementLimits(this.station.id, elementId, elementLimits).subscribe(data => {
      if (data.length > 0) {
        this.elementLimits = data;
        this.pagesDataService.showToast({ title: "Element Limits", message: "Element limits saved", type: "success" }); 
      }
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
