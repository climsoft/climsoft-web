import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { UsersService } from '../services/users.service';
import { UserGroupsService } from '../services/user-groups.service';
import { ViewUserModel } from '../models/view-user.model';
import { CreateUserModel } from '../models/create-user.model';

@Component({
  selector: 'app-user-input-dialog',
  templateUrl: './user-input-dialog.component.html',
  styleUrls: ['./user-input-dialog.component.scss']
})
export class UserInputDialogComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open!: boolean;
  protected title: 'Edit User' | 'New User' = 'New User';
  protected viewUser!: ViewUserModel;

  constructor(
    private usersService: UsersService,
    private userGroupsService: UserGroupsService,
    private pagesDataService: PagesDataService) { }

  public openDialog(userId?: number): void {
    if (userId) {
      this.title = 'Edit User';
      this.usersService.findOne(userId).pipe(
        take(1)
      ).subscribe((res) => {
        if (!res) throw new Error('User not found');
        this.viewUser = res;
        this.open = true;
      });
    } else {
      this.title = 'New User';
      this.viewUser = {
        id: 0,
        name: '',
        email: '',
        phone: '',
        isSystemAdmin: true,
        groupId: 0,
        permissions: null,
        extraMetadata: null,
        disabled: false,
        comment: null,
      };
      this.open = true;
    }
  }

  protected onGroupChange(groupId: number): void {
    this.viewUser.groupId = groupId;
    this.onIsSytemAdminChange(false);
    if (groupId) {
      this.userGroupsService.findOne(groupId).pipe(
        take(1)
      ).subscribe((data) => {
        this.viewUser.permissions = data.permissions;
      });
    }
  }

  protected onIsSytemAdminChange(isSystemAdmin: boolean): void {
    this.viewUser.isSystemAdmin = isSystemAdmin;
    this.viewUser.permissions = this.viewUser.isSystemAdmin ? null : {};
  }

  protected onOkClick(): void {
    if (!this.viewUser.name) {
      this.pagesDataService.showToast({ title: 'User Details', message: 'Name required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.viewUser.email) {
      this.pagesDataService.showToast({ title: 'User Details', message: 'Email required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const createUser: CreateUserModel = {
      name: this.viewUser.name,
      email: this.viewUser.email,
      phone: this.viewUser.phone || null,
      isSystemAdmin: this.viewUser.isSystemAdmin,
      groupId: this.viewUser.groupId || null,
      permissions: this.viewUser.permissions,
      extraMetadata: this.viewUser.extraMetadata,
      disabled: this.viewUser.disabled,
      comment: this.viewUser.comment || null,
    };

    if (this.title === 'New User') {
      this.usersService.create(createUser).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} created`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'User Details', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
        }
      });
    } else {
      this.usersService.update(this.viewUser.id, createUser).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'User Details', message: err.error?.message || 'Failed to save changes', type: ToastEventTypeEnum.ERROR });
        }
      });
    }
  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.usersService.delete(this.viewUser.id).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'User Details', message: 'User deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'User Details', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
    this.open = false;
  }
}
