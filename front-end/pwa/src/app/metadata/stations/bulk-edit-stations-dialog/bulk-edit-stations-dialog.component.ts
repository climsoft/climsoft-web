import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationsCacheService } from '../services/stations-cache.service';
import { CreateStationModel } from '../models/create-station.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-bulk-edit-stations-dialog',
  templateUrl: './bulk-edit-stations-dialog.component.html',
  styleUrls: ['./bulk-edit-stations-dialog.component.scss']
})
export class BulkEditStationsDialogComponent {
  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected saving: boolean = false;
  protected editableStations: CreateStationModel[] = [];
  private originalStations: CreateStationModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();

  constructor(
    private stationsCacheService: StationsCacheService,
    private pagesDataService: PagesDataService,
  ) { }

  public showDialog(stations: CreateStationModel[]): void {
    this.originalStations = stations.map(s => ({ ...s }));
    this.editableStations = stations.map(s => ({ ...s }));
    this.saving = false;
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(10); // Important to note that beyond 10 stations, the tab starts hanging. Possibly due to angular change detection system
    this.pageInputDefinition.setTotalRowCount(stations.length);
    this.open = true;
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): CreateStationModel[] {
    return this.editableStations.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected get changedCount(): number {
    let count = 0;
    for (let i = 0; i < this.editableStations.length; i++) {
      if (this.isRowChanged(i)) count++;
    }
    return count;
  }

  protected isRowChanged(index: number): boolean {
    return JSON.stringify(this.editableStations[index]) !== JSON.stringify(this.originalStations[index]);
  }

  private getChangedStations(): CreateStationModel[] {
    return this.editableStations.filter((_, i) => this.isRowChanged(i));
  }

  protected onSave(): void {
    const changed = this.getChangedStations();
    if (changed.length === 0) {
      this.pagesDataService.showToast({ title: 'Bulk Edit', message: 'No records were changed', type: ToastEventTypeEnum.INFO });
      return;
    }

    this.saving = true;

    // Format dates for the backend (append time component)
    const formattedStations = changed.map(s => ({
      ...s,
      dateEstablished: s.dateEstablished ? `${s.dateEstablished.substring(0, 10)}T00:00:00.000Z` : undefined,
      dateClosed: s.dateClosed ? `${s.dateClosed.substring(0, 10)}T00:00:00.000Z` : undefined,
    }));

    this.stationsCacheService.bulkPut(formattedStations).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.open = false;
        this.pagesDataService.showToast({ title: 'Bulk Edit Stations', message: `${changed.length} station(s) updated successfully`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: (err) => {
        this.saving = false;
        this.pagesDataService.showToast({ title: 'Bulk Edit Error', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onEnterKey(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.tagName !== 'INPUT' || target.readOnly) return;

    const td = target.closest('td');
    if (!td) return;
    const tr = td.closest('tr');
    if (!tr) return;

    const colIndex = Array.from(tr.children).indexOf(td);
    const nextRow = tr.nextElementSibling;

    if (nextRow) {
      event.preventDefault();
      const nextCell = nextRow.children[colIndex] as HTMLElement;
      const nextInput = nextCell?.querySelector('input:not([readonly])') as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    } else if (this.pageInputDefinition.page < this.pageInputDefinition.totalPages) {
      event.preventDefault();
      this.pageInputDefinition.onNext();
      setTimeout(() => {
        const tbody = (event.target as HTMLElement).closest('table')?.querySelector('tbody');
        const firstRow = tbody?.querySelector('tr');
        if (firstRow) {
          const cell = firstRow.children[colIndex] as HTMLElement;
          const input = cell?.querySelector('input:not([readonly])') as HTMLInputElement;
          if (input) input.focus();
        }
      }, 0);
    }
  }

  protected onCancelClick(): void {
    this.open = false;
  }
}
