import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { ViewUserModel } from '../models/view-user.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { UserRoleEnum } from '../models/user-role.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';


@Component({
  selector: 'view-app-users',
  templateUrl: './view-users.component.html',
  styleUrls: ['./view-users.component.scss']
})
export class ViewUsersComponent {
  users!: ViewUserModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private usersService: UsersService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Users');
    this.usersService.findAll().subscribe(data => {
      this.users = data;
    });
  }

  protected getFormattedUserRole(userRole: UserRoleEnum):string{
    return StringUtils.formatEnumForDisplay(userRole);
  }

  protected onSearchClick() { }

  protected onNewUserClick() {
    this.router.navigate(['user-detail', 'new'], { relativeTo: this.route.parent });
  }

  protected onEditUserClick(viewUser: ViewUserModel) {
    this.router.navigate(['user-detail', viewUser.id], { relativeTo: this.route.parent });
  }
}
