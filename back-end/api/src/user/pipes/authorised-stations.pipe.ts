import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';
import { ViewObservationQueryDTO } from 'src/observation/dtos/view-observation-query.dto';
import { EntryFormObservationQueryDto } from 'src/observation/dtos/entry-form-observation-query.dto';
import { ViewStationQueryDTO } from 'src/metadata/stations/dtos/view-station-query.dto';
import { CreateObservationDto } from 'src/observation/dtos/create-observation.dto';
import { DeleteObservationDto } from 'src/observation/dtos/delete-observation.dto';
import { ViewObservationLogQueryDto } from 'src/observation/dtos/view-observation-log-query.dto'; 
import { UserPermissionDto } from '../dtos/user-permission.dto';

@Injectable()
export class AuthorisedStationsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('stations meta name: ', metadata.metatype, ' | Path: ', this.request.route.path)

    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // user is not admin and has no permissions then throw error
    if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    // Ensure metatype is available
    if (!metadata.metatype) {
      throw new BadRequestException('Could not determine how to authorize stations');
    }

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array':
        // Used by
        //return this.handleArray(value, authorisedStationIds);
        return value;
      case 'String':
        // Used by 
        //return this.handleString(value, authorisedStationIds);
        return value;
      case ViewStationQueryDTO.name:
        //return this.handleViewStationQueryDTO(value as ViewStationQueryDTO, authorisedStationIds);
        return value;
      case EntryFormObservationQueryDto.name:
        return this.handleCreateObservationQueryDto(value as EntryFormObservationQueryDto, user.permissions);
      case CreateObservationDto.name:
        return this.handleCreateObservationQueryDto(value as CreateObservationDto, user.permissions);
      case ViewObservationQueryDTO.name:
        if (this.request.route.path === '/observations/correction-data' || this.request.route.path === '/observations/count-correction-data') {
          return this.handleCorrectionViewObservationQueryDTO(value as ViewObservationQueryDTO, user.permissions);
        } else if (this.request.route.path === '/observations/' || this.request.route.path === '/observations/count') {
          return this.handleMonitoringViewObservationQueryDTO(value as ViewObservationQueryDTO, user.permissions);
        }else{
          throw new BadRequestException('Observations route path not authorised');
        }
      case ViewObservationLogQueryDto.name:
        return value;
      case DeleteObservationDto.name:
        return this.handleCreateObservationQueryDto(value as CreateObservationDto, user.permissions);
      default: 
        throw new BadRequestException('Could not determine how to authorize stations');
    }
  }

  private handleCreateObservationQueryDto(value: EntryFormObservationQueryDto | CreateObservationDto | DeleteObservationDto, userPermissions: UserPermissionDto): EntryFormObservationQueryDto | CreateObservationDto | DeleteObservationDto {
    if (!userPermissions.entryPermissions) throw new BadRequestException('Not authorised to enter data');

    if (!userPermissions.entryPermissions.stationIds) return value;

    if (value && this.allAreAuthorisedStations([value.stationId], userPermissions.entryPermissions.stationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to enter data for station');
    }
  }

  private handleCorrectionViewObservationQueryDTO(value: ViewObservationQueryDTO, userPermissions: UserPermissionDto): ViewObservationQueryDTO {
    if (!value) throw new BadRequestException('Query value must be defined');

    if (!userPermissions.entryPermissions) throw new BadRequestException('Not authorised to enter data');

    if (!userPermissions.entryPermissions.stationIds) return value;

    const authorisedStationIds: string[] = userPermissions.entryPermissions.stationIds;

    if (value.stationIds && !this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
      throw new BadRequestException('Not authorised to correct station(s)');
    } else {
      value.stationIds = authorisedStationIds;
    }
    return value;
  }

  private handleMonitoringViewObservationQueryDTO(value: ViewObservationQueryDTO, userPermissions: UserPermissionDto): ViewObservationQueryDTO {
    if (!value) throw new BadRequestException('Query value must be defined');

    if (!userPermissions.ingestionMonitoringPermissions) throw new BadRequestException('Not authorised to monitor data');

    if (!userPermissions.ingestionMonitoringPermissions.stationIds) return value;

    const authorisedStationIds: string[] = userPermissions.ingestionMonitoringPermissions.stationIds;

    if (value.stationIds && !this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
      throw new BadRequestException('Not authorised to monitor station(s)');
    } else {
      value.stationIds = authorisedStationIds;
    }
    return value;
  }

   // TODO
  private handleArray(value: string[], authorisedStationIds: string[]): string[] {
    if (value) {
      if (!this.allAreAuthorisedStations(value, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to access station(s)');
      }
    } else {
      value = authorisedStationIds;
    }
    return value;
  }

   // TODO
  private handleString(value: string, authorisedStationIds: string[]): string {
    if (value && this.allAreAuthorisedStations([value], authorisedStationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access station(s)');
    }
  }

  // TODO
  private handleViewStationQueryDTO(value: ViewStationQueryDTO, authorisedStationIds: string[]): ViewStationQueryDTO {
    if (value.stationIds) {
      if (!this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to access station(s)');
      }
    } else {
      value.stationIds = authorisedStationIds;
    }
    return value;
  }


  private allAreAuthorisedStations(requestedIds: string[], authorisedIds: string[]): boolean {
    return requestedIds.every(id => authorisedIds.includes(id));
  }
}
