import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request } from 'express';
import { CreateImportTabularSourceDTO } from 'src/metadata/dtos/sources/create-import-source-tabular.dto';
import { CreateUpdateSourceDto } from 'src/metadata/dtos/sources/create-update-source.dto';


@Injectable()
export class ValidateImportSourcePipe implements PipeTransform {

  // TODO. Not sure if this is an acceptable way of getting the request object froom a pipe.
  // Check if there are better ways of getting the request object or in this case the session in a pipe.
  constructor(@Inject(REQUEST) private readonly request: Request) {
  }


  // TODO. Modify this pipe to ensure that the generic type is always returned.
  // When its an array expected and was not passed, yet the user is allowed access to stations, return an empty array.
  // This will iprove on consistency.
  public async transform(value: any, metadata: ArgumentMetadata) {

     console.log('Import source pipe',"value: ", value," metadata: ", metadata);

     if (!metadata.metatype || metadata.metatype === CreateUpdateSourceDto) {
      return value;
    }

    const object: CreateUpdateSourceDto<CreateImportTabularSourceDTO> = plainToInstance( CreateUpdateSourceDto<CreateImportTabularSourceDTO>, value);

    // TODO. Very likely not needed because this should be called after the global validate pipe has been called.
    const errors = await validate(object);
    if (errors.length > 0) {
      console.log("Import source validation errors: ", errors);
      throw new BadRequestException('Validation failed');
    }
    return value;

    // const user = AuthUtil.getSessionUser(this.request);
    // if (!user) {
    //   return value;
    // }


    // // Admins are allowed to access all or any station
    // // Users that don't have authorised stations are also allowed to access all or any station
    // if (AuthUtil.sessionUserIsAdmin(this.request) || user.authorisedStationIds === null) {
    //   return value;
    // }


    // if (metadata.metatype === Array) {

    //   const stationIds = this.checkValidStations(value, user.authorisedStationIds);

    //   if (stationIds) {
    //     return stationIds;
    //   } else {
    //     throw new BadRequestException('Not authorised to access station(s)');
    //   }

    // }else if(metadata.metatype === String){
    //   const stationIds = this.checkValidStations([value], user.authorisedStationIds);

    //   if (stationIds) {
    //     return stationIds[0];
    //   } else {
    //     throw new BadRequestException('Not authorised to access station(s)');
    //   }
    // }


    //todo. do validation
    return value;
  }

  private checkValidStations(requestedIds: string[] | null, authorisedIds: string[]): string[] | null {
    //If there are any requested ids, then validate them, if not then just return the authorised ids
    if (requestedIds && requestedIds.length > 0) {
        const isValid = requestedIds.every(id => authorisedIds.includes(id));
        return isValid ? requestedIds : null;
    } else {
        return authorisedIds;
    }
}


}
