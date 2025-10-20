import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { QCTestsService } from '../services/qc-tests.service';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('quality-control')
export class QualityControlController {
  constructor(private readonly sourceCheckService: QCTestsService) { }

  @Get('duplicates')
  findObservationsWithDuplicates(@Query(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
    return this.sourceCheckService.findSameObsWithDiffSources(queryDto);
  }

  @Get('count-duplicates')
  countObservationsWithDuplicates(@Query(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
    return this.sourceCheckService.countSameObsWithDiffSources(queryDto);
  }

  @Post('perform-qc')
  performQC(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
    return this.sourceCheckService.performQC(queryDto, AuthUtil.getLoggedInUserId(request));
  }

}
