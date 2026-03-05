import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { StationInputDialogComponent } from '../../station-input-dialog/station-input-dialog.component';

@Component({
  selector: 'app-view-stations-table',
  templateUrl: './view-stations-table.component.html',
  styleUrls: ['./view-stations-table.component.scss']
})
export class ViewStationsTableComponent implements OnChanges, OnDestroy {
  @ViewChild('dlgStationEdit') dlgStationEdit!: StationInputDialogComponent;
  @Input() public stations!: StationCacheModel[];

  protected isSystemAdmin: boolean = false;
  protected sortedStations: StationCacheModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stations']) {
      this.sortedStations = [...this.stations];
      this.applySort();
      this.updatePaging();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): StationCacheModel[] {
    return this.sortedStations.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.sortedStations.length);
  }

  protected onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.pageInputDefinition.onFirst();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.sortedStations.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (this.sortColumn === 'latitude') {
        aVal = a.location?.latitude;
        bVal = b.location?.latitude;
      } else if (this.sortColumn === 'longitude') {
        aVal = a.location?.longitude;
        bVal = b.location?.longitude;
      } else {
        aVal = (a as any)[this.sortColumn];
        bVal = (b as any)[this.sortColumn];
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }

  protected onEditClick(stationId: string): void {
    if (this.isSystemAdmin) {
      this.dlgStationEdit.showDialog(stationId);
    }
  }

}
