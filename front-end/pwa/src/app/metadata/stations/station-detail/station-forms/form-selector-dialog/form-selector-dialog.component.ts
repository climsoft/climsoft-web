import { Component, Input, Output, EventEmitter } from '@angular/core';
import { take } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/sources/models/source-type.enum';
import { ViewSourceModel } from 'src/app/metadata/sources/models/view-source.model';
import { SourcesCacheService } from 'src/app/metadata/sources/services/sources-cache.service';

export interface ItemSelection extends ViewSourceModel {
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


  constructor(private readonly sourceCacheService: SourcesCacheService) { }

  public openDialog( selectedIds: number[] = []): void {
    this.selectedIds = selectedIds;
    this.open = true;
    
    this.sourceCacheService.cachedSources.pipe(
      take(1)
    ).subscribe(data => {
      this.items = data
        .filter(item => item.sourceType === SourceTypeEnum.FORM) 
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
