import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import {  REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';
import { ViewObservationQueryDTO } from 'src/observation/dtos/view-observation-query.dto';
import { EntryFormObservationQueryDto } from 'src/observation/dtos/entry-form-observation-query.dto';
import { ViewStationQueryDTO } from 'src/metadata/stations/dtos/view-station-query.dto';
import { CreateObservationDto } from 'src/observation/dtos/create-observation.dto';
import { DeleteObservationDto } from 'src/observation/dtos/delete-observation.dto';
import { ViewObservationLogQueryDto } from 'src/observation/dtos/view-observation-log-query.dto';

@Injectable()
export class AuthorisedStationsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request ) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('meta name: ', metadata.metatype);
    console.log('url: ', this.request.url)
    console.log('originalUrl: ', this.request.originalUrl)
    console.log('baseUrl: ', this.request.baseUrl)
    console.log('Path: ', this.request.route.path)

    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // TODO. Throw the correct exception that relates to authorisation
    //if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    //const authorisedStationIds = AuthUtil.getUserAuthorisedStations(user);
    //if(!authorisedStationIds) return value;

    // Ensure metatype is available
    if (!metadata.metatype) {
      throw new BadRequestException('Could not determine how to authorize stations');
    }

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array':
        return value;
      //return this.handleArray(value, authorisedStationIds);
      case 'String':
        return value;
      //return this.handleString(value, authorisedStationIds);
      case ViewStationQueryDTO.name:
        return value;
      //return this.handleViewStationQueryDTO(value as ViewStationQueryDTO, authorisedStationIds);
      case ViewObservationQueryDTO.name:
        return value;
      //return this.handleViewObservationQueryDTO(value as ViewObservationQueryDTO, authorisedStationIds);
      case EntryFormObservationQueryDto.name:
        return value;
      //return this.handleCreateObservationQueryDto(value as EntryFormObservationQueryDto, authorisedStationIds);
      case ViewObservationLogQueryDto.name:
        return value;
      case CreateObservationDto.name:
        return value;
      case DeleteObservationDto.name:
        return value;
      default:
        // TODO. Throw the correct exception that relates to authorisation
        throw new BadRequestException('Could not determine how to authorize stations');
    }
  }

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

  private handleString(value: string, authorisedStationIds: string[]): string {
    if (value && this.allAreAuthorisedStations([value], authorisedStationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access station(s)');
    }
  }

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

  private handleViewObservationQueryDTO(value: ViewObservationQueryDTO, authorisedStationIds: string[]): ViewObservationQueryDTO {
    if (value.stationIds) {
      if (!this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to access station(s)');
      }
    } else {
      value.stationIds = authorisedStationIds;
    }
    return value;
  }

  private handleCreateObservationQueryDto(value: EntryFormObservationQueryDto, authorisedStationIds: string[]): EntryFormObservationQueryDto {
    if (value && this.allAreAuthorisedStations([value.stationId], authorisedStationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access station(s)');
    }
  }

  private allAreAuthorisedStations(requestedIds: string[], authorisedIds: string[]): boolean {
    return requestedIds.every(id => authorisedIds.includes(id));
  }
}
