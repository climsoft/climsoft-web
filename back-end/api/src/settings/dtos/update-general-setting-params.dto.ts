import { ValidateNested } from "class-validator";
import { SchedulerSettingDto } from "./settings/scheduler-setting.dto";
import { ClimsoftDisplayTimeZoneDto } from "./settings/climsoft-display-timezone.dto";
import { ClimsoftBoundaryDto } from "./settings/climsoft-boundary.dto";
import { Type } from "class-transformer";
import { BadRequestException } from "@nestjs/common";

export type GeneralSettingParameters = ClimsoftBoundaryDto | ClimsoftDisplayTimeZoneDto | SchedulerSettingDto;


// TODO. Is the whole class needed if property `parameters` is the  only one needed to be validated? Investigate how the class can be made redundant if validations can directly apply to the `parameters` property
export class UpdateGeneralSettingParametersDto {

  @ValidateNested()
  @Type((options) => {
    // The 'options.object' gives access to the parent DTO,
    // allowing us to dynamically select the correct validation class
    // for the 'parameters' property based on its contents.

    const object = options?.object;
    if (!object?.parameters) {
      throw new BadRequestException('parameters are required');
    }

    const { parameters } = object as UpdateGeneralSettingParametersDto;

    if ((parameters as ClimsoftBoundaryDto).longitude !== undefined) {
      return ClimsoftBoundaryDto;
    } else if ((parameters as ClimsoftDisplayTimeZoneDto).utcOffset !== undefined) {
      return ClimsoftDisplayTimeZoneDto;
    } else if ((parameters as SchedulerSettingDto).jobQueueCleanup !== undefined) {
      return SchedulerSettingDto;
    } else {
      throw new BadRequestException('parameters are not recognised');
    }

  })
  parameters: GeneralSettingParameters;

}