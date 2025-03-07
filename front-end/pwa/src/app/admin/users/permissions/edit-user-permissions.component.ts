import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../services/users.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewUserModel } from '../models/view-user.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateUserModel } from '../models/create-user.model';
import { UserPermissionModel } from '../models/user-permission.model';

@Component({
  selector: 'app-edit-user-permissions',
  templateUrl: './edit-user-permissions.component.html',
  styleUrls: ['./edit-user-permissions.component.scss']
})
export class EditUserPermissionsComponent implements OnInit {
  @Input()
  public userPermissions!: UserPermissionModel; 

  constructor(

    private route: ActivatedRoute,
    private usersService: UsersService,
    private location: Location,
  ) {

  }

  ngOnInit() {
   

  }



  protected onRoleSelection(role: string | null): void {
    if (role) {
      //this.viewUser.role = role;
    }
  }

  protected onStationsSelection(stationIds: string[]): void {
    // this.viewUser.authorisedStationIds = stationIds.length > 0 ? stationIds : null;
  }

  protected onElementsSelection(elementIds: number[]): void {
    //this.viewUser.authorisedElementIds = elementIds.length > 0 ? elementIds : null;
  }

}
