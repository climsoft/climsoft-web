import { Component, ViewChild } from '@angular/core';
import { UsersService } from '../services/users.service';
import { ViewUserModel } from '../models/view-user.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { take } from 'rxjs';
import { UserGroupsService } from '../services/user-groups.service';
import { UserInputDialogComponent } from '../user-input-dialog/user-input-dialog.component';


interface ViewUser extends ViewUserModel {
  groupName: string;
}

@Component({
  selector: 'view-app-users',
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss']
})
export class ViewUsersComponent {
  @ViewChild('dlgUserInput') dlgUserInput!: UserInputDialogComponent;

  users!: ViewUser[];

  constructor(
    private pagesDataService: PagesDataService,
    private usersService: UsersService,
    private userGroupsService: UserGroupsService) {
    this.pagesDataService.setPageHeader('Users');
    this.loadUsers();
  }

  private loadUsers(): void {
    this.usersService.findAll().pipe(take(1)).subscribe(users => {
      this.setUsergroupNames(users);
    });
  }

  private setUsergroupNames(users: ViewUserModel[]) {
    this.userGroupsService.findAll().pipe(take(1)).subscribe(userGroups => {
      this.users = users.map(user => {
        let groupName = '';
        if (user.groupId) {
          const userG = userGroups.find(item => item.id === user.groupId);
          groupName = userG ? userG.name : ''
        } else if (user.isSystemAdmin) {
          groupName = 'System Administrator';
        }
        return { ...user, groupName: groupName }
      });
    });
  }

  protected onSearchClick() { }

  protected onNewUserClick() {
    this.dlgUserInput.openDialog();
  }

  protected onEditUserClick(viewUser: ViewUserModel) {
    this.dlgUserInput.openDialog(viewUser.id);
  }

  protected onUserSaved(): void {
    this.loadUsers();
  }
}
