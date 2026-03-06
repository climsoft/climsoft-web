import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { UpdateElementModel } from 'src/app/metadata/elements/models/update-element.model';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';

@Component({
  selector: 'app-element-input-dialog',
  templateUrl: './element-input-dialog.component.html',
  styleUrls: ['./element-input-dialog.component.scss']
})
export class ElementInputDialogComponent {
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open!: boolean;
  protected title: string = '';
  protected element!: CreateViewElementModel;

  constructor(
    private elementsCacheService: ElementsCacheService,
    private pagesDataService: PagesDataService) { }

  public showDialog(elementId?: number): void {
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
      description: this.element.description || undefined,
      units: this.element.units || undefined,
      typeId: this.element.typeId ?? undefined,
      entryScaleFactor: this.element.entryScaleFactor ?? undefined,
      comment: this.element.comment || undefined
    }

    let saveSubscription: Observable<CreateViewElementModel>;
    if (this.element.id === 0) {
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
        message = this.element.id === 0 ? `${data.name} created` : `${data.name} updated`;
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
