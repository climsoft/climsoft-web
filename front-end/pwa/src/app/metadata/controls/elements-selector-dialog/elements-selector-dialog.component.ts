import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ElementModel } from 'src/app/core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';

export interface ElementSelection extends ElementModel {
  selected: boolean;
}

@Component({
  selector: 'app-elements-selector-dialog',
  templateUrl: './elements-selector-dialog.component.html',
  styleUrls: ['./elements-selector-dialog.component.scss']
})
export class ElementsSelectorDialogComponent {
  @Input() title: string = 'Select Element';
  @Input() okButtonLabel: string = 'Add';
  @Output() ok = new EventEmitter<number[]>();
  open: boolean = false;
  elements!: ElementSelection[];
  private selectedIds!: number[];
  private exludeIds!: number[];

  constructor(private readonly elementsService: ElementsService) { }

  openDialog(): void {
    this.selectedIds = [];
    this.exludeIds = [];
    this.setupDialog()
  }

  openDialogWithSelectedElements(selectedIds: number[]): void {
    this.selectedIds = selectedIds;
    this.exludeIds = [];
    this.setupDialog();
  }

  openDialogWithExcludedElements(exludeIds: number[]): void {
    this.selectedIds = [];
    this.exludeIds = exludeIds;
    this.setupDialog();
  }

  private setupDialog(): void {
    this.open = true;
    this.elementsService.getElements().subscribe(data => {
      this.elements = data
        .filter(element => !this.exludeIds.includes(element.id))
        .map(element => ({ ...element, selected: this.selectedIds.includes(element.id) }));
    });

  }

  onElementClicked(element: ElementSelection): void {
    // Toggle element selection
    element.selected = !element.selected;

    // Update selectedIds based on the selected forms
    this.selectedIds = this.elements.filter(f => f.selected).map(f => f.id);
  }

  onOkClick(): void {
    // Emit the updated selectedIds
    this.ok.emit(this.selectedIds);
  }

}
