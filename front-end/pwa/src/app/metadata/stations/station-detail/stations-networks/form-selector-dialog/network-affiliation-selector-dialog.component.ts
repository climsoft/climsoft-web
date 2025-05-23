import { Component, Input, Output, EventEmitter } from '@angular/core';
import { take } from 'rxjs';
import { ViewNetworkAffiliationModel } from 'src/app/metadata/network-affiliations/models/view-network-affiliation.model';
import { NetworkAffiliationsCacheService } from 'src/app/metadata/network-affiliations/services/network-affiliations-cache.service';

export interface ItemSelection extends ViewNetworkAffiliationModel {
  selected: boolean;
}

@Component({
  selector: 'app-network-affiliation-selector-dialog',
  templateUrl: './network-affiliation-selector-dialog.component.html',
  styleUrls: ['./network-affiliation-selector-dialog.component.scss']
})
export class NetworkAffiliationSelectorDialogComponent {
  @Input() public title: string = 'Select Network Affiliation';
  @Input() public okButtonLabel: string = "OK";
  @Output() public ok = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected items!: ItemSelection[];
  private selectedIds: number[] = [];


  constructor(private networkAffiliationsCacheService: NetworkAffiliationsCacheService) { }

  public openDialog( selectedIds: number[] = []): void {
    this.selectedIds = selectedIds;
    this.open = true;
    
    this.networkAffiliationsCacheService.cachedNetworkAffiliations.pipe(
      take(1)
    ).subscribe(data => {
      this.items = data
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
