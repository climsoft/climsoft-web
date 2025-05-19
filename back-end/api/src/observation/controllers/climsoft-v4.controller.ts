import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ClimsoftWebToV4SyncService } from '../services/climsoft-web-to-v4-sync.service';
import { AuthUtil } from 'src/user/services/auth.util';
import { Request } from 'express';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ClimsoftV4WebSyncSetUpService } from '../services/climsoft-v4-web-sync-set-up.service'; 
import { ClimsoftV4ImportParametersDto } from '../dtos/climsoft-v4-import-parameters.dto';
import { ClimsoftV4ToWebSyncService } from '../services/climsoft-v4-to-web-sync.service';

@Controller('climsoft-v4')
export class ClimsoftV4Controller {
  constructor(
    private climsoftV4V5SetUpService: ClimsoftV4WebSyncSetUpService,
    private climsoftV5ToV4Service: ClimsoftWebToV4SyncService,
    private climsoftV4ToV5SyncService: ClimsoftV4ToWebSyncService) {
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
    await this.climsoftV5ToV4Service.saveWebObservationstoV4DB();
    return { message: 'success' };
  }

  @Admin()
  @Post('start-observations-import')
  async startObservationsImport(
    @Req() request: Request,
    @Body() importParameters: ClimsoftV4ImportParametersDto) { 
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
