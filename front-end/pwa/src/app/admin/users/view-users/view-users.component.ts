import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { ViewUserModel } from '../models/view-user.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { take } from 'rxjs';
import { UserGroupsService } from '../services/user-groups.service';


interface ViewUser extends ViewUserModel {
  groupName: string;
}

@Component({
  selector: 'view-app-users',
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss']
})
export class ViewUsersComponent {
  users!: ViewUser[];

  constructor(
    private pagesDataService: PagesDataService,
    private usersService: UsersService,
    private userGroupsService: UserGroupsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Users');
    this.usersService.findAll().pipe(take(1)).subscribe(users => {
      this.setUsergroupNames(users);
    });
  }

  private setUsergroupNames(users: ViewUserModel[]) {
    this.userGroupsService.findAll().pipe(take(1)).subscribe(userGroups => {
      this.users = users.map(element => {
        const userG = userGroups.find(item => item.id === element.groupId);
        return { ...element, groupName: userG ? userG.name : '' }
      });
    });
  }

  protected onSearchClick() { }


  protected onNewUserClick() {
    this.router.navigate(['user-details', 'new'], { relativeTo: this.route.parent });
  }

  protected onEditUserClick(viewUser: ViewUserModel) {
    this.router.navigate(['user-details', viewUser.id], { relativeTo: this.route.parent });
  }
}
