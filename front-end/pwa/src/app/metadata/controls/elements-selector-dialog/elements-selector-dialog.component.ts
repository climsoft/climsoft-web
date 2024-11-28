import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';

export interface ItemSelection extends CreateViewElementModel {
  selected: boolean;
}

@Component({
  selector: 'app-elements-selector-dialog',
  templateUrl: './elements-selector-dialog.component.html',
  styleUrls: ['./elements-selector-dialog.component.scss']
})
export class ElementsSelectorDialogComponent {
  @Input() public title: string = "Select Element";
  @Input() public okButtonLabel: string = "OK";
  @Output() public ok = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected items!: ItemSelection[];
  private selectedIds: number[] = [];
  private showSelectedIdsOnly: boolean = false;
  private excludeIds: number[] = [];

  constructor(private readonly elementsService: ElementsService) { }

  public openDialog(excludeIds: number[] = [], selectedIds: number[] = [], showSelectedIdsOnly: boolean = false): void {
    this.excludeIds = excludeIds;
    this.selectedIds = selectedIds;
    this.showSelectedIdsOnly = showSelectedIdsOnly;
    this.open = true;

    this.elementsService.find().subscribe(data => {
      if (this.showSelectedIdsOnly && this.selectedIds && this.selectedIds.length > 0) {
        this.items = data
          .filter(item => this.selectedIds.includes(item.id))
          .map(item => ({ ...item, selected: this.selectedIds.includes(item.id) }));;
      }

      this.items = data
        .filter(item => !this.excludeIds.includes(item.id))
        .map(item => ({ ...item, selected: this.selectedIds.includes(item.id) }));
    });

  }

  protected onItemClicked(item: ItemSelection): void {
    // Toggle element selection
    item.selected = !item.selected;

    // Update selectedIds based on the selected forms
    // TODO. This is set in realtime because in future we may want to show the number of items selected 
    this.selectedIds = this.items.filter(item => item.selected).map(item => item.id);
  }

  protected onOkClick(): void {
    // Emit the updated selectedIds
    this.ok.emit(this.selectedIds);
  }

}
