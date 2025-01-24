import { Controller, Post, Req } from '@nestjs/common';
import { ClimsoftV4Service } from '../services/climsoft-v4.service';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';

@Controller('climsoft-v4')
export class ClimsoftV4Controller {
  constructor(private climsoftv4Service: ClimsoftV4Service) { }

  @Post('connection-state')
  async checkConnectionState() {
    const connected: boolean = await this.climsoftv4Service.getConnectionState()
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Post('pull-elements')
  async pullElements(@Req() request: Request) {
    const saved: boolean = await this.climsoftv4Service.saveV4ElementsToV5DB(AuthUtil.getLoggedInUserId(request))
    return { message: saved ? 'success' : 'error' };
  }

  @Admin()
  @Post('pull-stations')
  async pullStations(@Req() request: Request) {
    const saved: boolean = await this.climsoftv4Service.saveV4StationsToV5DB(AuthUtil.getLoggedInUserId(request));
    return { message: saved ? 'success' : 'error' };
  }

  @Admin()
  @Post('save-observations')
  async saveObservations() {
    this.climsoftv4Service.saveObservationstoV4DB();
    return { message: 'success' };
  }

}
