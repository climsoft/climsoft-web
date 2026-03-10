import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementCacheModel, ElementsCacheService } from '../services/elements-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { OptionEnum } from 'src/app/shared/options.enum';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ImportElementsDialogComponent } from '../import-elements-dialog/import-elements-dialog.component';
import { ElementInputDialogComponent } from '../element-input-dialog/element-input-dialog.component';
import { BulkEditElementsDialogComponent } from '../bulk-edit-elements-dialog/bulk-edit-elements-dialog.component';
import { ElementsSearchDialogComponent } from '../elements-search-dialog/elements-search-dialog.component';
import { CreateViewElementModel } from '../models/create-view-element.model';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-view-elements',
  templateUrl: './view-elements.component.html',
  styleUrls: ['./view-elements.component.scss']
})
export class ViewElementsComponent implements OnDestroy {
  @ViewChild('dlgInputElement') dlgInputElement!: ElementInputDialogComponent;
  @ViewChild('dlgImportElements') dlgImportElements!: ImportElementsDialogComponent;
  @ViewChild('dlgBulkEditElements') dlgBulkEditElements!: BulkEditElementsDialogComponent;
  @ViewChild('dlgSearchElements') dlgSearchElements!: ElementsSearchDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected allElements: ElementCacheModel[] = [];
  protected elements: ElementCacheModel[] = [];
  protected searchedIds: number[] = [];

  protected dropDownItems: OptionEnum[] = [];
  protected isSystemAdmin: boolean = false;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private elementsCacheService: ElementsCacheService,
    private appAuthService: AppAuthService,) {

    this.pagesDataService.setPageHeader('Elements');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.dropDownItems = [OptionEnum.DOWNLOAD];
      if (this.isSystemAdmin) {
        this.dropDownItems.push(OptionEnum.DELETE_ALL);
      }
    });

    this.elementsCacheService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allElements = data;
      // Always call filtered search ids because when the caches refreshes, the selected ids will not be the ones shown
      this.filterSearchedIds();
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ElementCacheModel[] {
    return this.elements.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected onSearchInput(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
    this.filterSearchedIds();
  }

  private filterSearchedIds(): void {
    this.elements = this.searchedIds && this.searchedIds.length > 0 ?
      this.allElements.filter(item => this.searchedIds.includes(item.id)) : [...this.allElements];
    this.applySort();
    this.updatePaging();
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.elements.length);
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
    this.elements.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  protected onAddClick(): void {
    if (this.isSystemAdmin) {
      this.dlgInputElement.showDialog();
    }
  }

  protected onEditClick(elementId: number): void {
    if (this.isSystemAdmin) {
      this.dlgInputElement.showDialog(elementId);
    }
  }

  protected onBulkEditClick(): void {
    if (this.isSystemAdmin) {
      const createModels: CreateViewElementModel[] = this.elements.map(data => ({
        id: data.id,
        abbreviation: data.abbreviation,
        name: data.name,
        description: data.description,
        units: data.units,
        typeId: data.typeId,
        entryScaleFactor: data.entryScaleFactor || undefined,
        comment: data.comment || undefined,
      }));
      this.dlgBulkEditElements.showDialog(createModels);
    }
  }

  protected onSearchClick(): void {
    this.dlgSearchElements.showDialog(this.searchedIds);
  }

  protected onImportClick(): void {
    if (this.isSystemAdmin) {
      this.dlgImportElements.showDialog();
    }
  }

  protected onOptionsClick(option: OptionEnum): void {
    switch (option) {
      case 'Delete All':
        this.dlgDeleteAllConfirm.openDialog();
        break;
      default:
        break;
    }
  }

  protected onDeleteAllConfirm(): void {
    this.elementsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
      this.pagesDataService.showToast({ title: "Elements Deleted", message: `All elements deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected get downloadLink(): string {
    return this.elementsCacheService.downloadLink;
  }

}
