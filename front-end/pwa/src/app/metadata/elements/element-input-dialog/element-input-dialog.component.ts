import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { UpdateElementModel } from 'src/app/metadata/elements/models/update-element.model';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-element-input-dialog',
  templateUrl: './element-input-dialog.component.html',
  styleUrls: ['./element-input-dialog.component.scss']
})
export class ElementInputDialogComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open!: boolean;
  protected title: 'Edit Element' | 'New Element' = 'New Element';
  protected element!: CreateViewElementModel;

  constructor(
    private elementsCacheService: ElementsCacheService,
    private pagesDataService: PagesDataService) { }

  public openDialog(elementId?: number): void {
    if (elementId) {
      this.title = "Edit Element";
      this.elementsCacheService.findOne(elementId).pipe(
        take(1)
      ).subscribe((data) => {
        if (!data) throw new Error('Element not found');
        this.element = {
          id: data.id,
          abbreviation: data.abbreviation,
          name: data.name,
          description: data.description,
          units: data.units,
          typeId: data.typeId,
          entryScaleFactor: data.entryScaleFactor || undefined,
          comment: data.comment || undefined,
        };
      });
    } else {
      this.title = "New Element";
      this.element = {
        id: 0,
        abbreviation: '',
        name: '',
        description: '',
        units: '',
        typeId: 0,
        entryScaleFactor: 1,
        comment: '',
      };
    }

    this.open = true;
  }

  protected onTypeChange(typeId: number | undefined): void {
    this.element.typeId = typeId ?? undefined;
  }

  protected onEntryScaleFactorChange(entryScaleFactor: number | undefined | null): void {
    this.element.entryScaleFactor = entryScaleFactor ?? undefined;
  }

  protected onOkClick(): void {
    // TODO. Do more validations
    if (!this.element.abbreviation) {
      this.pagesDataService.showToast({ title: 'Element Details', message: 'Element abbreviation required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.element.name) {
      this.pagesDataService.showToast({ title: 'Element Details', message: 'Element name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const updatedElement: UpdateElementModel = {
      name: this.element.name,
      abbreviation: this.element.abbreviation,
      description: this.element.description || undefined,
      units: this.element.units || undefined,
      typeId: this.element.typeId || undefined,
      entryScaleFactor: this.element.entryScaleFactor ?? undefined,
      comment: this.element.comment || undefined
    }

    if (this.title === 'New Element') {
      this.elementsCacheService.add({ ...updatedElement, id: this.element.id }).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Element Details', message: `${data.name} created`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'Element Details', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
        }
      });
    } else {
      this.elementsCacheService.update(this.element.id, updatedElement).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Element Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'Element Details', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
        }
      });
    }

  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.elementsCacheService.delete(this.element.id).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Element Details', message: 'Element deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();     
      },
      error: (err) => {
        console.error(err);
        this.pagesDataService.showToast({ title: 'Element Details', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
    this.open = false;
  }
}
