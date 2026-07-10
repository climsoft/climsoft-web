import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { ViewSourceSpecificationModel } from 'src/app/metadata/source-specifications/models/view-source-specification.model';
import { CreateSourceSpecificationModel } from '../models/create-source-specification.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-source-clone-dialog',
  templateUrl: './source-clone-dialog.component.html',
  styleUrls: ['./source-clone-dialog.component.scss']
})
export class SourceCloneDialogComponent {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;

  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected sourceToClone!: ViewSourceSpecificationModel;

  protected newName: string = '';
  protected newDescription: string = '';

  protected saving: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourcesCacheService,
  ) { }


  public openDialog(source: ViewSourceSpecificationModel): void {
    this.sourceToClone = structuredClone(source);
    this.title = `Clone ${source.sourceType === SourceTypeEnum.IMPORT ? 'Import' : 'Form'} Specification`;
    this.newName = `${source.name} (copy)`;
    this.newDescription = source.description;
    this.saving = false;
    this.open = true;
  }


  protected onSave(): void {
    if (!this.newName.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Source', message: 'Enter a name', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.newDescription.trim()) {
      this.pagesDataService.showToast({ title: 'Clone Source', message: 'Enter a description', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.dlgSaveConfirm.openDialog();
  }
  protected onSaveConfirm(): void {
    const payload: CreateSourceSpecificationModel = {
      name: this.newName.trim(),
      description: this.newDescription.trim(),
      sourceType: this.sourceToClone.sourceType,
      parameters: this.sourceToClone.parameters,
      utcOffset: this.sourceToClone.utcOffset,
      allowMissingValue: this.sourceToClone.allowMissingValue,
      scaleValues: this.sourceToClone.scaleValues,
      adapterId: this.sourceToClone.adapterId,
      sampleFileOperationId: null, // Don't clone file operation ids as sample files for sources are expected to be unique
      disabled: this.sourceToClone.disabled,
      comment: null, // No need to clone the comment.
    };

    this.saving = true;
    this.sourcesCacheService.add(payload).pipe(take(1)).subscribe({
      next: () => {
        this.saving = false;
        this.pagesDataService.showToast({
          title: 'Clone Source',
          message: `Source ${payload.name} created`,
          type: ToastEventTypeEnum.SUCCESS,
        });
        this.open = false;
        this.ok.emit();
      },
      error: err => {
        this.saving = false;
        console.error(err);
        this.pagesDataService.showToast({
          title: 'Clone Source',
          message: err.error?.message || 'Something bad happened',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }



}
