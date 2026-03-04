import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';
import { CreateViewElementModel } from '../models/create-view-element.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-bulk-edit-elements-dialog',
  templateUrl: './bulk-edit-elements-dialog.component.html',
  styleUrls: ['./bulk-edit-elements-dialog.component.scss']
})
export class BulkEditElementsDialogComponent {
  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected saving: boolean = false;
  protected editableElements: CreateViewElementModel[] = [];
  private originalElements: CreateViewElementModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();

  constructor(
    private elementsCacheService: ElementsCacheService,
    private pagesDataService: PagesDataService,
  ) { }

  public showDialog(elements: CreateViewElementModel[]): void {
    this.originalElements = elements.map(e => ({ ...e }));
    this.editableElements = elements.map(e => ({ ...e }));
    this.saving = false;
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(elements.length);
    this.open = true;
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): CreateViewElementModel[] {
    return this.editableElements.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected get changedCount(): number {
    let count = 0;
    for (let i = 0; i < this.editableElements.length; i++) {
      if (this.isRowChanged(i)) count++;
    }
    return count;
  }

  protected isRowChanged(index: number): boolean {
    return JSON.stringify(this.editableElements[index]) !== JSON.stringify(this.originalElements[index]);
  }

  private getChangedElements(): CreateViewElementModel[] {
    return this.editableElements.filter((_, i) => this.isRowChanged(i));
  }

  protected onSave(): void {
    const changed = this.getChangedElements();
    if (changed.length === 0) {
      this.pagesDataService.showToast({ title: 'Bulk Edit', message: 'No records were changed', type: ToastEventTypeEnum.INFO });
      return;
    }

    this.saving = true;
    this.elementsCacheService.bulkPut(changed).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.open = false;
        this.pagesDataService.showToast({ title: 'Bulk Edit Elements', message: `${changed.length} element(s) updated successfully`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: (err) => {
        this.saving = false;
        this.pagesDataService.showToast({ title: 'Bulk Edit Error', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onCancelClick(): void {
    this.open = false;
  }
}
