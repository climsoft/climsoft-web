import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ViewUserGroupModel } from '../models/view-user-group.model';
import { UserGroupsService } from '../services/user-groups.service';
import { CreateUserGroupModel } from '../models/create-user-group.model';

@Component({
  selector: 'app-user-group-details',
  templateUrl: './user-group-details.component.html',
  styleUrls: ['./user-group-details.component.scss']
})
export class UserGroupDetailsComponent implements OnInit {
  protected viewUserGroup!: ViewUserGroupModel;

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private usersService: UserGroupsService,
    private location: Location,
  ) {
  }

  ngOnInit() {
    const userId = this.route.snapshot.params['id'];

    if (StringUtils.containsNumbersOnly(userId)) {
      this.usersService.findOne(+userId).subscribe((data) => {
        this.viewUserGroup = data;
        this.pagesDataService.setPageHeader('Edit User Group');
      });
    } else {
      this.viewUserGroup = { id: 0, name: '', description: '', comment: '', permissions: {} };
      this.pagesDataService.setPageHeader('New User Group');
    }

  }

  protected onStationsSelection(stationIds: string[]): void {
    // this.viewUser.authorisedStationIds = stationIds.length > 0 ? stationIds : null;
  }

  protected onElementsSelection(elementIds: number[]): void {
    //this.viewUser.authorisedElementIds = elementIds.length > 0 ? elementIds : null;
  }

  protected onSaveClick(): void {
    // TODO. do validations

    if (!this.viewUserGroup.name) {
      return;
    }

    const createUser: CreateUserGroupModel = {
      name: this.viewUserGroup.name,
      description: this.viewUserGroup.description,
      comment: this.viewUserGroup.comment,
      permissions: {},
    }

    if (this.viewUserGroup.id > 0) {
      this.usersService.update(this.viewUserGroup.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User  GroupDetails', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });

    } else {
      this.usersService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User Group Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });
    }
  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
