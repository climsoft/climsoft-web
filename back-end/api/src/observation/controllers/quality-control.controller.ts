import { Body, Controller, Post, Req } from '@nestjs/common';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { QCTestAssessmentsService } from '../services/qc-test-assessments.service';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('observations/quality-control')
export class QualityControlController {
  constructor(private readonly qcTestAssessmentsService: QCTestAssessmentsService) { }

  @Post('perform-qc')
  performQC(
    @Req() request: Request,
    @Body(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
    return this.qcTestAssessmentsService.performQC(queryDto, AuthUtil.getLoggedInUserId(request));
  }

}
