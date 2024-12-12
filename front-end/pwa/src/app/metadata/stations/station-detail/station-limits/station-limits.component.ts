import { Component, Input, OnInit } from '@angular/core';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationElementsService } from 'src/app/metadata/stations/services/station-elements.service';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError, finalize } from 'rxjs/operators';
import { StationElementLimitModel } from 'src/app/core/models/stations/station-element-limit.model';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { StationCacheModel } from '../../services/stations-cache.service';

@Component({
  selector: 'app-station-limits',
  templateUrl: './station-limits.component.html',
  styleUrls: ['./station-limits.component.scss']
})
export class StationLimitsComponent implements OnInit {
  @Input()
  public station!: StationCacheModel;

  protected elements!: CreateViewElementModel[];
  protected elementLimits!: StationElementLimitModel[];

  constructor(
    private stationElementsService: StationElementsService,
    private pagesDataService: PagesDataService,
  ) {
  }

  ngOnInit() {
    this.loadElements();
  }

  protected loadElements(): void {
    this.stationElementsService.getStationElements(this.station.id).subscribe((data) => {
      this.elements = data;
    });
  }

  protected get elementIds(): number[] {
    return this.elements.map(element => element.id) ?? [];
  }

  protected onElementsEdited(selectedIds: number[]): void {

    let addedIds: number[] = selectedIds;
    let removeIds: number[] = [];

   // TODO. delete doesn't work well.

    if (this.elements && this.elements.length > 0) {
      const existingElementIds = this.elements.map(element => element.id);
      //filter existing element ids 
      addedIds = selectedIds.filter(id => !existingElementIds.includes(id));

      //get existing element ids that have been removed 
      removeIds = existingElementIds.filter(id => !selectedIds.includes(id));
    }

    // Use RxJS to optimize simultaneous operations
    if (addedIds.length > 0) {
      this.updateStationElements(addedIds, 'ADD')
        .pipe(
          // Ensure delete operation starts only after add operation completes
          switchMap(() => removeIds.length > 0 ? this.updateStationElements(removeIds, 'DELETE') : of(null)),
          // Reload elements after completion
          finalize(() => this.loadElements())
        )
        .subscribe();
    } else if (removeIds.length > 0) {
      this.updateStationElements(removeIds, 'DELETE').pipe(finalize(() => this.loadElements()))
        .pipe(
          // Reload elements after completion
          finalize(() => this.loadElements())
        )
        .subscribe();
    }
  }

  private updateStationElements(ids: number[], action: 'ADD' | 'DELETE'): Observable<number[] | null> {
    if (ids.length === 0) {
      // Immediately complete if no elements to process
      return of(null);
    }

    const operation = action === 'ADD'
      ? this.stationElementsService.saveStationElements(this.station.id, ids)
      : this.stationElementsService.deleteStationElements(this.station.id, ids);

    return operation.pipe(
      tap(data => {
        if (data.length > 0) {
          const message: string = action === "ADD" ? "Elements Added" : "Elements Deleted";
          this.pagesDataService.showToast({ title: "Station Element", message: message, type: ToastEventTypeEnum.SUCCESS });
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

  protected loadElementLimits(elementId: number): void {
    this.stationElementsService.getStationElementLimits(this.station.id, elementId).subscribe((data) => {
      this.elementLimits = data;
    });
  }

  protected getMonthName(monthId: number): string {
    return DateUtils.getMonthName(monthId)
  }

  protected onElementLimitsEdited(elementId: number, elementLimits: StationElementLimitModel[]): void {

    //save limits. Server will handle deletions
    this.stationElementsService.saveStationElementLimits(this.station.id, elementId, elementLimits).subscribe(data => {
      if (data.length > 0) {
        this.elementLimits = data;
        this.pagesDataService.showToast({ title: "Element Limits", message: "Element limits saved", type: ToastEventTypeEnum.SUCCESS });
      }
    });

  }


}
