import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { SourceModel } from 'src/app/core/models/source.model';
import { SourcesService } from 'src/app/core/services/sources.service';

export interface ItemSelection extends SourceModel {
  selected: boolean;
}

@Component({
  selector: 'app-form-selector-dialog',
  templateUrl: './form-selector-dialog.component.html',
  styleUrls: ['./form-selector-dialog.component.scss']
})
export class FormSelectorDialogComponent {
  @Input() public title: string = "Select Form";
  @Input() public okButtonLabel: string = "OK";
  @Output() public ok = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected items!: ItemSelection[];
  private selectedIds: number[] = [];
  private showSelectedIdsOnly: boolean = false;
  private excludeIds: number[] = [];

  constructor(private readonly sourcesService: SourcesService) { }

  public openDialog(excludeIds: number[] = [], selectedIds: number[] = [], showSelectedIdsOnly: boolean = false): void {
    this.excludeIds = excludeIds;
    this.selectedIds = selectedIds;
    this.showSelectedIdsOnly = showSelectedIdsOnly;
    this.open = true;

    const elementSubscription: Observable<SourceModel[]> = this.showSelectedIdsOnly ? this.sourcesService.getForms(this.selectedIds) : this.sourcesService.getForms();
    elementSubscription.subscribe(data => {
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
