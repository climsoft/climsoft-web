import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

import { UserGroupsService } from '../services/user-groups.service';
import { ViewUserGroupModel } from '../models/view-user-group.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-user-group-selector-single',
  templateUrl: './user-group-selector-single.component.html',
  styleUrls: ['./user-group-selector-single.component.scss']
})
export class UserGroupSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();


  protected allUserGroups: ViewUserGroupModel[] = [];
  protected userGroups!: ViewUserGroupModel[];
  protected selectedUserGroup!: ViewUserGroupModel | null;

  constructor(private userGroupsService: UserGroupsService) {
    this.userGroupsService.findAll().pipe(take(1)).subscribe(data => {
      this.allUserGroups = data;
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filterBasedOnSelectedIds();
  }

  private filterBasedOnSelectedIds(): void {
    this.userGroups = this.allUserGroups;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.userGroups = this.userGroups.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const foundElement = this.userGroups.find(data => data.id === this.selectedId);
    this.selectedUserGroup = foundElement ? foundElement : null;
  }

  protected optionDisplayFunction(option: ViewUserGroupModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewUserGroupModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
