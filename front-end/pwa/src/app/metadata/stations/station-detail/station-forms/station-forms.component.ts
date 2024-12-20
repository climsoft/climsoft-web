import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core'; 
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationFormsService } from 'src/app/metadata/stations/services/station-forms.service';
import { Observable, of, Subject } from 'rxjs';
import { switchMap, tap, catchError, finalize, takeUntil } from 'rxjs/operators';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { StationCacheModel } from '../../services/stations-cache.service';

@Component({
  selector: 'app-station-forms',
  templateUrl: './station-forms.component.html',
  styleUrls: ['./station-forms.component.scss']
})
export class StationFormsComponent implements OnChanges {

  @Input()
  public station!: StationCacheModel;

  protected forms!: ViewSourceModel[];

  private destroy$ = new Subject<void>();

  public constructor(
    private stationFormsService: StationFormsService,
    private pagesDataService: PagesDataService,
  ) { }
  
  ngOnChanges(changes: SimpleChanges): void {
    if(this.station){
      this.loadForms();
    }   
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadForms(): void {
    this.stationFormsService.find(this.station.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      this.forms = data;
    });
  }

  protected get formIds(): number[] {
    return this.forms.map(form => form.id) ?? [];
  }

  protected onFormsEdited(selectedIds: number[]): void {

    let addedIds: number[] = selectedIds;
    let removeIds: number[] = [];

    if (this.forms && this.forms.length > 0) {
      const existingFormIds = this.forms.map(element => element.id);
      //filter existing form ids 
      addedIds = selectedIds.filter(id => !existingFormIds.includes(id));

      //get existing form ids that have been removed 
      removeIds = existingFormIds.filter(id => !selectedIds.includes(id));
    }

    // Use RxJS to optimize simultaneous operations
    if (addedIds.length > 0) {
      this.updateStationForms(addedIds, 'ADD')
        .pipe(
          // Ensure delete operation starts only after add operation completes
          switchMap(() => removeIds.length > 0 ? this.updateStationForms(removeIds, 'DELETE') : of(null)),
          // Handle both operations completion
          finalize(() => this.loadForms())
        )
        .subscribe();
    } else if (removeIds.length > 0) {
      this.updateStationForms(removeIds, 'DELETE').pipe(finalize(() => this.loadForms())).subscribe();
    }
  }

  private updateStationForms(ids: number[], action: 'ADD' | 'DELETE'): Observable<number[] | null> {
    if (ids.length === 0) {
      // Immediately complete if no forms to process
      return of(null);
    }

    const operation = action === 'ADD'
      ? this.stationFormsService.update(this.station.id, ids)
      : this.stationFormsService.delete(this.station.id, ids);

    return operation.pipe(
      tap(data => {
        if (data.length > 0) {
          const message: string = action === "ADD" ? "Forms Added" : "Forms Deleted";
          this.pagesDataService.showToast({ title: "Station Forms", message: message, type: ToastEventTypeEnum.SUCCESS});
        }
      }),
      catchError(error => {
        // TODO. Handle the error appropriately
        console.error(error);
        return of(null); // or throw an observable error if you want to stop the chain
      })
    );
  }

}
