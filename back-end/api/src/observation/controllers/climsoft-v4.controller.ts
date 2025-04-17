import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ClimsoftV5ToV4SyncService } from '../services/climsoft-v5-to-v4-sync.service';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ClimsoftV4V5SyncSetUpService } from '../services/climsoft-v4-v5-sync-set-up.service';
import { ClimsoftV4ToV5SyncService } from '../services/climsoft-v4-to-v5-sync.service';
import { ClimsoftV4ImportParametersDto } from '../dtos/climsoft-v4-import-parameters.dto';

@Controller('climsoft-v4')
export class ClimsoftV4Controller {
  constructor(
    private climsoftV4V5SetUpService: ClimsoftV4V5SyncSetUpService,
    private climsoftV5ToV4Service: ClimsoftV5ToV4SyncService,
    private climsoftV4ToV5SyncService: ClimsoftV4ToV5SyncService) {
  }

  @Admin()
  @Get('connection-state')
  async checkConnectionState() {
    const connected: boolean = await this.climsoftV4V5SetUpService.getConnectionState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Get('v4-conflicts')
  getV4Conflicts() {
    return this.climsoftV4V5SetUpService.getV4Conflicts();
  }

  @Admin()
  @Get('import-state')
  async checkImportState() {
    const connected: boolean = await this.climsoftV4ToV5SyncService.getImportState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Get('v4-import-parameters')
  async getImportSourceParameters() {
    return this.climsoftV4ToV5SyncService.getV4ImportParameters();
  }

  @Admin()
  @Post('connect')
  async connect() {
    await this.climsoftV4V5SetUpService.setupV4DBConnection();
    const connected: boolean = await this.climsoftV4V5SetUpService.getConnectionState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Post('disconnect')
  async disconnect() {
    await this.climsoftV4V5SetUpService.disconnect();
    return { message: 'success' };
  }

  @Admin()
  @Post('import-elements')
  async pullElements(@Req() request: Request) {
    const saved: boolean = await this.climsoftV4V5SetUpService.saveV4ElementsToV5DB(AuthUtil.getLoggedInUserId(request));
    return { message: saved ? 'success' : 'error' };
  }

  @Admin()
  @Post('import-stations')
  async pullStations(@Req() request: Request) {
    const saved: boolean = await this.climsoftV4V5SetUpService.saveV4StationsToV5DB(AuthUtil.getLoggedInUserId(request));
    return { message: saved ? 'success' : 'error' };
  }

  @Admin() 
  @Post('save-observations')
  async saveObservations() {
    this.climsoftV4V5SetUpService.resetV4Conflicts();
    await this.climsoftV5ToV4Service.saveV5ObservationstoV4DB();
    return { message: 'success' };
  }

  @Admin()
  @Post('start-observations-import')
  async startObservationsImport(
    @Req() request: Request,
    @Body() importParameters: ClimsoftV4ImportParametersDto) {
      console.log('start import params: ', importParameters)
    this.climsoftV4V5SetUpService.resetV4Conflicts();
    await this.climsoftV4ToV5SyncService.startV4Import(importParameters, AuthUtil.getLoggedInUser(request).id);
    return { message: 'success' };
  }

  @Admin()
  @Post('stop-observations-import')
  async stopObservationsImport() {
    this.climsoftV4V5SetUpService.resetV4Conflicts();
    await this.climsoftV4ToV5SyncService.stopV4Import();
    return { message: 'success' };
  }

}
