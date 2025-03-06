import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewUserModel } from '../models/view-user.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { take } from 'rxjs';
import { ViewUserGroupModel } from '../models/view-user-group.model';
import { UserGroupsService } from '../services/user-groups.service';


@Component({
  selector: 'view-app-user-groups',
  templateUrl: './view-user-groups.component.html',
  styleUrls: ['./view-user-groups.component.scss']
})
export class ViewUserGroupsComponent {
  userGroups!: ViewUserGroupModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private userGroupsService: UserGroupsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('User Groups');
    this.userGroupsService.findAll().pipe(take(1)).subscribe(data => {
      this.userGroups = data;
    });
  }


  protected onSearchClick() { }

  protected onNewUserGroupClick() {
    this.router.navigate(['user-group-detail', 'new'], { relativeTo: this.route.parent });
  }

  protected onEditUserGroupClick(viewUser: ViewUserGroupModel) {
    this.router.navigate(['user-group-detail', viewUser.id], { relativeTo: this.route.parent });
  }
}
