import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { UpdateElementModel } from 'src/app/metadata/elements/models/update-element.model';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';

@Component({
  selector: 'app-edit-element-dialog',
  templateUrl: './edit-element-dialog.component.html',
  styleUrls: ['./edit-element-dialog.component.scss']
})
export class EditElementDialogComponent {
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open!: boolean;
  protected title: string = '';
  protected bNew: boolean = false;
  protected element!: CreateViewElementModel;

  constructor(
    private elementsCacheService: ElementsCacheService,
    private pagesDataService: PagesDataService) { }

  public showDialog(elementId?: number): void {
    if (elementId) {
      this.title = "Edit Element";
      this.bNew = false;
      this.elementsCacheService.findOne(elementId).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.element = {
            id: data.id,
            abbreviation: data.abbreviation,
            name: data.name,
            description: data.description,
            units: data.units,
            typeId: data.typeId,
            entryScaleFactor: data.entryScaleFactor,
            comment: data.comment ? data.comment : null
          };
        }

      });
    } else {
      this.title = "New Element";
      this.bNew = true;
      this.element = {
        id: 0,
        abbreviation: '',
        name: '',
        description: '',
        units: '',
        typeId: 0,
        entryScaleFactor: 1,
        comment: null,
      };
    }

    this.open = true;
  }

  protected onTypeChange(typeId: number | null): void {
    if (typeId) {
      this.element.typeId = typeId;
    }
  }

  protected onOkClick(): void {
    // TODO. Do more validations
    if (!this.element.abbreviation) {
      this.pagesDataService.showToast({ title: "Element Characteristics", message: 'Element abbreviation required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.element.name) {
      this.pagesDataService.showToast({ title: "Element Characteristics", message: 'Element name required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.element.typeId) {
      this.pagesDataService.showToast({ title: "Element Characteristics", message: 'Element type required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const updatedElement: UpdateElementModel = {
      name: this.element.name,
      abbreviation: this.element.abbreviation,
      description: this.element.description,
      units: this.element.units,
      typeId: this.element.typeId,
      entryScaleFactor: this.element.entryScaleFactor,
      comment: this.element.comment
    }

    let saveSubscription: Observable<CreateViewElementModel>;
    if (this.bNew) {
      saveSubscription = this.elementsCacheService.add({ ...updatedElement, id: this.element.id });
    } else {
      saveSubscription = this.elementsCacheService.update(this.element.id, updatedElement);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: ToastEventTypeEnum;
      if (data) {
        message = this.bNew ? `${data.name} created` : `${data.name} updated`;
        messageType = ToastEventTypeEnum.SUCCESS;
      } else {
        message = "Error in saving element";
        messageType = ToastEventTypeEnum.ERROR
      }
      this.pagesDataService.showToast({ title: "Element Characteristics", message: message, type: messageType });
      this.ok.emit();
    });
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
  }
}
