import { NgModule } from '@angular/core';
import { UsersComponent } from './users/users.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { SharedModule } from '../shared/shared.module';
import { UserRoutingModule } from './user-routing.module';
import { UserRoleSingleInputComponent } from './controls/user-role-input/user-role-single-input/user-role-single-input.component';
import { PasswordChangeComponent } from './password-change/password-change.component';
import { MetadataModule } from '../metadata/metadata.module';

// TODO. ADD ROUTING

@NgModule({
  declarations: [
    UsersComponent,
    UserDetailsComponent,
    UserRoleSingleInputComponent,
    PasswordChangeComponent
  ],
  imports: [
    UserRoutingModule,
    SharedModule,
    MetadataModule,    
  ]
})
export class UserModule { }
