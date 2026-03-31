import { Controller, Get, Query } from '@nestjs/common';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { AuthorisedStationsPipe } from 'src/user/pipes/authorised-stations.pipe';
import { SourceCheckService } from '../services/source-check.service';

@Controller('observations/source-check')
export class SourceCheckController {
    constructor(private readonly sourceCheckService: SourceCheckService) { }

    @Get('exists')
    existsDuplicates(@Query(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
        return this.sourceCheckService.existsDuplicates(queryDto);
    }

    @Get('count')
    countDuplicates(@Query(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
        return this.sourceCheckService.countDuplicates(queryDto);
    }

    @Get('find')
    findDuplicates(@Query(AuthorisedStationsPipe) queryDto: ViewObservationQueryDTO) {
        return this.sourceCheckService.findDuplicates(queryDto);
    }
}
