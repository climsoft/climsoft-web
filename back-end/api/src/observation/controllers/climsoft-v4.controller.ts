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
    private climsoftV4WebSetUpService: ClimsoftV4WebSyncSetUpService,
    private climsoftWebToV4Service: ClimsoftWebToV4SyncService,
    private climsoftV4ToWebSyncService: ClimsoftV4ToWebSyncService) {
  }

  @Admin()
  @Get('connection-state')
  async checkConnectionState() {
    const connected: boolean = await this.climsoftV4WebSetUpService.getConnectionState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Get('v4-conflicts')
  getV4Conflicts() {
    return this.climsoftV4WebSetUpService.getV4Conflicts();
  }

  @Admin()
  @Get('import-state')
  async checkImportState() {
    const connected: boolean = await this.climsoftV4ToWebSyncService.getImportState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Get('v4-import-parameters')
  async getImportSourceParameters() {
    return this.climsoftV4ToWebSyncService.getV4ImportParameters();
  }

  @Admin()
  @Post('connect')
  async connect() {
    await this.climsoftV4WebSetUpService.setupV4DBConnection();
    const connected: boolean = await this.climsoftV4WebSetUpService.getConnectionState();
    return { message: connected ? 'success' : 'error' };
  }

  @Admin()
  @Post('disconnect')
  async disconnect() {
    await this.climsoftV4WebSetUpService.disconnect();
    return { message: 'success' };
  }

  @Admin()
  @Post('import-elements')
  async importElements(@Req() request: Request) {
    const saved: boolean = await this.climsoftV4WebSetUpService.saveV4ElementsToV5DB(AuthUtil.getLoggedInUserId(request));
    return { message: saved ? 'success' : 'error' };
  }

  @Admin()
  @Post('import-stations')
  async importStations(@Req() request: Request) {
    const saved: boolean = await this.climsoftV4WebSetUpService.saveV4StationsToV5DB(AuthUtil.getLoggedInUserId(request));
    return { message: saved ? 'success' : 'error' };
  }

  @Admin()
  @Post('save-observations')
  async saveObservations() {
    this.climsoftV4WebSetUpService.resetV4Conflicts();
    await this.climsoftWebToV4Service.saveWebObservationstoV4DB();
    return { message: 'success' };
  }

  @Admin()
  @Post('start-observations-import')
  async startObservationsImport(
    @Req() request: Request,
    @Body() importParameters: ClimsoftV4ImportParametersDto) { 
    this.climsoftV4WebSetUpService.resetV4Conflicts();
    await this.climsoftV4ToWebSyncService.startV4Import(importParameters, AuthUtil.getLoggedInUser(request).id);
    return { message: 'success' };
  }

  @Admin()
  @Post('stop-observations-import')
  async stopObservationsImport() {
    this.climsoftV4WebSetUpService.resetV4Conflicts();
    await this.climsoftV4ToWebSyncService.stopV4Import();
    return { message: 'success' };
  }

}
