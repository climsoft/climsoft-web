import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourcesCacheService } from '../services/source-cache.service';
import { StationFormsService } from '../../stations/services/station-forms.service';
import { StationsSearchDialogComponent } from '../../stations/stations-search-dialog/stations-search-dialog.component';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { FormSourceInputDialogComponent } from '../form-source-input-dialog/form-source-input-dialog.component';
import { ImportSourceInputDialogComponent } from '../import-source-input-dialog/import-source-input-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

interface View extends ViewSourceModel {
  // Applicable to form source only
  assignedStations: number;
  sourceTypeName: string;
}

@Component({
  selector: 'app-view-sources',
  templateUrl: './view-sources.component.html',
  styleUrls: ['./view-sources.component.scss']
})
export class ViewSourcesComponent implements OnDestroy {
  @ViewChild('appSearchAssignedStations') appStationSearchDialog!: StationsSearchDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;
  @ViewChild('dlgFormEdit') dlgFormEdit!: FormSourceInputDialogComponent;
  @ViewChild('dlgImportEdit') dlgImportEdit!: ImportSourceInputDialogComponent;

  protected sources: View[] = [];
  protected selectedSource: View | null = null;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourcesCacheService,
    private stationFormsService: StationFormsService) {

    this.pagesDataService.setPageHeader('Source Specifications');

    // Get all sources 
    this.sourcesCacheService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(sources => {

      this.sources = sources.map(item => {
        return { ...item, sourceTypeName: StringUtils.formatEnumForDisplay(item.sourceType), assignedStations: 0 }
      });

      // Remove version 4 source from display. It's not editable by user
      this.sources = this.sources.filter(item => item.name !== 'climsoft_v4');
      this.applySort();
      this.updatePaging();

      // Get number of stations assigned to use form
      this.stationFormsService.getStationCountPerForm().pipe(
        take(1),
      ).subscribe((stationsCountPerSource) => {
        for (const count of stationsCountPerSource) {
          const source = this.sources.find(item => item.id === count.formId);
          if (source) {
            source.assignedStations = count.stationCount
          }
        }
      });
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onOptionsClicked(sourceTypeName: 'Form' | 'Import' | 'Delete All') {
    switch (sourceTypeName) {
      case 'Form':
        this.dlgFormEdit.openDialog();
        break;
      case 'Import':
        this.dlgImportEdit.openDialog();
        break;
      case 'Delete All':
        this.dlgDeleteAllConfirm.openDialog();
        return;
      default:
        throw new Error('Developer error, option not supported');
    }
  }

  protected onDeleteAllConfirm(): void {
    this.sourcesCacheService.deleteAll().pipe(
      take(1)
    ).subscribe(data => {
      this.pagesDataService.showToast({ title: "Source Specifications Deleted", message: `All source specifications deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onEditSource(source: ViewSourceModel): void {
    switch (source.sourceType) {
      case SourceTypeEnum.FORM:
        this.dlgFormEdit.openDialog(source.id);
        break;
      case SourceTypeEnum.IMPORT:
        this.dlgImportEdit.openDialog(source.id);
        break;
      default:
        throw new Error('Developer error: Source type not supported');
    }
  }

  protected onAssignStationsClicked(selectedSource: View, event: Event) {
    event.stopPropagation();
    this.selectedSource = selectedSource;
    this.stationFormsService.getStationsAssignedToUseForm(selectedSource.id).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.appStationSearchDialog.showDialog(data, undefined, `Allocate/Deallocate Stations for ${selectedSource.name}`);
    });
  }

  protected onAssignFormToStationsInput(stationIds: string[]): void {
    if (!this.selectedSource) return;
    this.stationFormsService.putStationsAssignedToUseForm(this.selectedSource.id, stationIds).pipe(
      take(1)
    ).subscribe(data => {
      if (this.selectedSource) {
        this.selectedSource.assignedStations = data.length;
      }
    });
  }

  protected onDeleteClick(source: View, event: Event): void {
    event.stopPropagation();
    this.selectedSource = source;
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedSource) return;
    this.sourcesCacheService.delete(this.selectedSource.id).pipe(
      take(1)
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: 'Source Specification', message: 'Source specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.selectedSource = null;
    });
  }

  protected onToggleDisabledClick(source: View, event: Event): void {
    event.stopPropagation();
    this.selectedSource = source;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedSource) return;
    const newDisabledState = !this.selectedSource.disabled;
    const { id, assignedStations, sourceTypeName, ...updateDto } = this.selectedSource;
    this.sourcesCacheService.update(id, { ...updateDto, disabled: newDisabledState }).pipe(
      take(1)
    ).subscribe({
      next: () => {
        const action = newDisabledState ? 'disabled' : 'enabled';
        this.pagesDataService.showToast({ title: 'Source Specification', message: `Source specification ${action}`, type: ToastEventTypeEnum.SUCCESS });
        this.selectedSource = null;
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Source Specification', message: `Error updating source specification - ${err.message}`, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): View[] {
    return this.sources.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
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
    this.sources.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.sources.length);
  }

}
