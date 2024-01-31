import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersComponent } from './users/users.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { SharedModule } from '../shared/shared.module';
import { UserRoutingModule } from './user-routing.module';
import { UserRoleSingleInputComponent } from './controls/user-role-input/user-role-single-input/user-role-single-input.component';

// TODO. ADD ROUTING

@NgModule({
  declarations: [
    UsersComponent,
    UserDetailsComponent,
    UserRoleSingleInputComponent
  ],
  imports: [
    SharedModule,
    UserRoutingModule,
  ]
})
export class UserModule { }
