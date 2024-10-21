import { Controller, Get, Query } from '@nestjs/common';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe'; 
import { SourceCheckService } from '../services/source-check.service';

@Controller('source-check')
export class SourceCheckController {
  constructor(private readonly sourceCheckService: SourceCheckService) { }

  @Get()
  find(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.sourceCheckService.findObservationsWithDuplicates(viewObsevationQuery);
  }
 
  @Get('count')
  count(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.sourceCheckService.countObservationsWithDuplicates(viewObsevationQuery);
  }

  @Get('sum')
  sum(@Query(AuthorisedStationsPipe) viewObsevationQuery: ViewObservationQueryDTO) {
    return this.sourceCheckService.sumOfObservationsWithDuplicates(viewObsevationQuery);
  }

}
