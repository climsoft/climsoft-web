import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { ElementDomainEnum } from 'src/app/metadata/elements/models/element-domain.enum';
import { UpdateElementModel } from 'src/app/metadata/elements/models/update-element.model';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';

@Component({
  selector: 'app-element-characteristics-input-dialog',
  templateUrl: './element-characteristics-input-dialog.component.html',
  styleUrls: ['./element-characteristics-input-dialog.component.scss']
})
export class ElementCharacteristicsInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = "";
  protected bNew: boolean = false;
  protected element!: CreateViewElementModel;

  constructor(
    private elementsCacheService: ElementsCacheService,
    private pagesDataService: PagesDataService) { }

  public openDialog(elementId?: number): void {
    this.open = true;

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
        entryScaleFactor: 0,
        comment: null
      };
    }

  }

  protected onTypeChange(typeId: number | null): void {
    if (typeId) {
      this.element.typeId = typeId;
    }
  }

  protected onOkClick(): void {
    // TODO. Do validations

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
      saveSubscription = this.elementsCacheService.create({ ...updatedElement, id: this.element.id });
    } else {
      saveSubscription = this.elementsCacheService.update(this.element.id, updatedElement);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: 'success' | 'error';
      if (data) {
        message = this.bNew ? `${data.name} created` : `${data.name} updated`;
        messageType = 'success';
      } else {
        message = "Error in saving element";
        messageType = 'error';
      }
      this.pagesDataService.showToast({ title: "Element Characteristics", message: message, type: messageType });
      this.ok.emit();
    });
  }
}
