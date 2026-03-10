import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { ViewOrganisationModel } from '../models/view-organisation.model';
import { OrganisationsCacheService } from '../services/organisations-cache.service';
import { OrganisationInputDialogComponent } from '../organisation-input-dialog/organisation-input-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

type optionsType = 'Add' | 'Delete All';

@Component({
  selector: 'app-view-organisations',
  templateUrl: './view-organisations.component.html',
  styleUrls: ['./view-organisations.component.scss']
})
export class ViewOrganisationsComponent implements OnDestroy {
  @ViewChild('dlgOrganisationDetails') dlgOrganisationDetails!: OrganisationInputDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  protected organisations: ViewOrganisationModel[] = [];
  protected isSystemAdmin: boolean = false;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private organisationsCacheService: OrganisationsCacheService,
  ) {

    this.pagesDataService.setPageHeader('Organisations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });

    // Get all sources 
    this.organisationsCacheService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.organisations = data;
      this.applySort();
      this.updatePaging();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onOptionsClicked(option: optionsType): void {
    if (option === 'Add') {
      this.dlgOrganisationDetails.openDialog();
    } else if (option === 'Delete All') {
      this.dlgDeleteAllConfirm.openDialog();
    }
  }

  protected onDeleteAllConfirm(): void {
    this.organisationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
      this.pagesDataService.showToast({ title: "Organisations Deleted", message: `All organisations deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onEditOrganisation(organisation: ViewOrganisationModel): void {
    if (!this.isSystemAdmin) return;
    this.dlgOrganisationDetails.openDialog(organisation.id);
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ViewOrganisationModel[] {
    return this.organisations.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
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
    this.organisations.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.organisations.length);
  }



}
