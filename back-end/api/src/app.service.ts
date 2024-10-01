import { Injectable } from '@nestjs/common';
import { UsersService } from './user/services/users.service';
import { SeedMetadataService } from './metadata/seed-metadata.service';
import { UserRoleEnum } from './user/enums/user-roles.enum';

@Injectable()
export class AppService {

  constructor( private readonly userService: UsersService,
    private readonly seedMetadataService: SeedMetadataService) { }


  public async seedDatabase(){
    // Call the seed methods
    await this.seedFirstUser();
    await this.seedMetadataService.seedMetadata();
  }

  private async seedFirstUser() {
    const count = await this.userService.count();
    if (count === 0) {
        const newUser = await this.userService.createUser(
            {
                name: "admin",
                email: "admin@climsoft.org",
                phone: '',
                role: UserRoleEnum.ADMINISTRATOR,
                authorisedStationIds: null,
                canDownloadData: false,
                authorisedElementIds: null,
                extraMetadata: null,
                disabled: false
            }
        );

       await this.userService.changeUserPassword({ userId: newUser.id, password: "climsoft@admin!2" })
    }
}

}
