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
  @Input() public title: string = 'Select Element';
  @Input() public okButtonLabel: string = 'Add';
  @Output() public ok = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected elements!: ElementSelection[];
  private selectedIds!: number[];
  private excludeIds!: number[];

  constructor(private readonly elementsService: ElementsService) { }

  public openDialog(): void {
    this.selectedIds = [];
    this.excludeIds = [];
    this.setupDialog()
  }

  public openDialogWithSelectedElements(selectedIds: number[]): void {
    this.selectedIds = selectedIds;
    this.excludeIds = [];
    this.setupDialog();
  }

  public openDialogWithExcludedElements(excludeIds: number[]): void {
    this.selectedIds = [];
    this.excludeIds = excludeIds;
    this.setupDialog();
  }

  private setupDialog(): void {
    this.open = true;
    this.elementsService.getElements().subscribe(data => {
      this.elements = data
        .filter(element => !this.excludeIds.includes(element.id))
        .map(element => ({ ...element, selected: this.selectedIds.includes(element.id) }));
    });

  }

  protected onElementClicked(element: ElementSelection): void {
    // Toggle element selection
    element.selected = !element.selected;

    // Update selectedIds based on the selected forms
    this.selectedIds = this.elements.filter(f => f.selected).map(f => f.id);
  }

  protected onOkClick(): void {
    // Emit the updated selectedIds
    this.ok.emit(this.selectedIds);
  }

}
