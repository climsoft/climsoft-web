import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../services/users.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewUserModel } from '../models/view-user.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateUserModel } from '../models/create-user.model';
import { take } from 'rxjs';
import { UserGroupsService } from '../services/user-groups.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  protected viewUser!: ViewUserModel;
  protected errorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private usersService: UsersService,
    private userGroupsService: UserGroupsService,
    private route: ActivatedRoute,
    private location: Location,
  ) {

  }

  ngOnInit() {
    const userId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(userId)) {
      this.pagesDataService.setPageHeader('Edit User');
      this.usersService.findOne(+userId).pipe(take(1)).subscribe((data) => {
        this.viewUser = data;
      });
    } else {
      this.pagesDataService.setPageHeader('New User');
      this.viewUser = { id: 0, name: '', email: '', phone: '', isSystemAdmin: true, groupId: 0, permissions: null, extraMetadata: null, disabled: false, comment: null };
    }

  }

  protected onGroupChange(groupId: number): void {
    this.viewUser.groupId = groupId;
    this.onIsSytemAdminChange(false)
    if (groupId) {
      this.userGroupsService.findOne(groupId).pipe(take(1)).subscribe((data) => {
        this.viewUser.permissions = data.permissions;
      });
    }
  }

  protected onIsSytemAdminChange(isSystemAdmin: boolean): void {
    this.viewUser.isSystemAdmin = isSystemAdmin;
    this.viewUser.permissions = this.viewUser.isSystemAdmin ? null : {};
  }


  protected onSaveClick(): void {
    // TODO. do validations
    this.errorMessage = '';

    if (!this.viewUser.name) {
      this.errorMessage = 'Input name';
      return;
    }

    if (!this.viewUser.email) {
      this.errorMessage = 'Input email';
      return;
    }

    const createUser: CreateUserModel = {
      name: this.viewUser.name,
      email: this.viewUser.email,
      phone: this.viewUser.phone ? this.viewUser.phone : null,
      isSystemAdmin: this.viewUser.isSystemAdmin,
      groupId: this.viewUser.groupId ? this.viewUser.groupId : null,
      permissions: this.viewUser.permissions,
      extraMetadata: this.viewUser.extraMetadata,
      disabled: this.viewUser.disabled,
      comment: this.viewUser.comment ? this.viewUser.comment : null,
    }

    if (this.viewUser.id > 0) {
      this.usersService.update(this.viewUser.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });

    } else {
      this.usersService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });
    }

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
