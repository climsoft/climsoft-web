import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CreateUserModel } from 'src/app/core/models/users/create-user.model';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { UserRoleEnum } from 'src/app/core/models/users/user-role.enum';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { UsersService } from 'src/app/core/services/users/users.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ViewUserModel } from 'src/app/core/models/users/view-user.model';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {
  protected viewUser!: ViewUserModel;
  protected bEnableSave: boolean = true;//todo. should be false by default

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private usersService: UsersService,
    private location: Location,
  ) {
    this.pagesDataService.setPageHeader('User Detail');
  }

  ngOnInit() {
    const userId = this.route.snapshot.params['id'];
    //console.log("element id", elementId)
    if (StringUtils.containsNumbersOnly(userId)) {
      this.usersService.findOne(userId).subscribe((data) => {
        this.viewUser = data;
      });
    } else {
      this.viewUser = { id: 0, name: "", email: "", phone: "", role: UserRoleEnum.ADMINISTRATOR, authorisedStationIds: null, canDownloadData: false, authorisedElementIds: null, extraMetadata: null, disabled: false };
    }

  }

  protected get userRoleIsNotAdmin() {
    return this.viewUser.role !== UserRoleEnum.ADMINISTRATOR
  }

  protected onRoleSelection(role: UserRoleEnum | null): void {
    if (role) {
      this.viewUser.role = role;
    }

  }

  protected onStationsSelection(stationIds: string[]): void {
    this.viewUser.authorisedStationIds = stationIds.length > 0 ? stationIds : null;
  }

  protected onElementsSelection(elementIds: number[]): void {
    this.viewUser.authorisedElementIds = elementIds.length > 0 ? elementIds : null;
  }

  protected onSaveClick(): void {
    // TODO. do validations

    const createUser: CreateUserModel = {
      name: this.viewUser.name,
      email: this.viewUser.email,
      phone: this.viewUser.phone,
      role: this.viewUser.role,
      authorisedStationIds: this.viewUser.authorisedStationIds,
      canDownloadData: this.viewUser.canDownloadData,
      authorisedElementIds: this.viewUser.authorisedElementIds,
      extraMetadata: this.viewUser.extraMetadata,
      disabled: this.viewUser.disabled
    }

    if (this.viewUser.id > 0) {
      this.usersService.update(this.viewUser.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} updated`, type: 'success' });
          this.location.back();
        }
      });

    } else {
      this.usersService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'User Details', message: `${data.name} saved`, type: 'success' });
          this.location.back();
        }
      });
    }

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
