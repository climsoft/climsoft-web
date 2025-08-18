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
import { StationStatusQueryDto } from 'src/observation/dtos/station-status-query.dto';
import { DataAvailabilitySummaryQueryDto } from 'src/observation/dtos/data-availability-summary-query.dto';
import { DataFlowQueryDto } from 'src/observation/dtos/data-flow-query.dto';

@Injectable()
export class AuthorisedStationsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    //console.log('stations meta name: ', metadata.metatype, ' | Path: ', this.request.route.path, ' | value: ', value)

    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // user is not admin and has no permissions then throw error
    if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    // Ensure metatype is available
    if (!metadata.metatype) {
      console.log('meta tyoe not determined: ', metadata.metatype);
      throw new BadRequestException('Could not determine how to authorize stations');
    }

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array':
        // TODO. Check where this is used
        //return this.handleArray(value, authorisedStationIds);
        return value;
      case 'String':
        // TODO. Use guards to authenticate? In similar way to Admin() decorator used by the app guard
        const routePath = this.request.route.path;
        if (
          routePath === '/stations/:id' ||
          routePath === '/station-network-affiliations/forms-assigned-to-station/:id' ||
          routePath === '/station-forms/forms-assigned-to-station/:id' ||
          routePath === '/observations/upload/:sourceid/:stationid'
        ) {
          return this.handleStationMetadataEdits(value, user.permissions);
        } else if (routePath === '/stations-observation-status/:stationid') {
          return this.handleMonitoringString(value, user.permissions);
        }

        // TODO. delete these
        // if (this.request.method === 'PATCH') {
        //   // Used by stations controller when updating station characteristics
        //   return this.handleStationMetadataEdits(value, user.permissions);
        // } else if (this.request.method === 'POST') {
        //   // Used by observations controller when importing data
        //   return this.handleStationMetadataEdits(value, user.permissions);
        // }

        return value;

      case ViewStationQueryDTO.name:
        // All stations metadata are freely available to any user that has access to Climsoft, so no need to validate here.
        //return this.handleViewStationQueryDTO(value as ViewStationQueryDTO, authorisedStationIds);
        return value;
      case EntryFormObservationQueryDto.name:
        return this.handleCreateObservationQueryDto(value as EntryFormObservationQueryDto, user.permissions);
      case CreateObservationDto.name:
        return this.handleCreateObservationQueryDto(value as CreateObservationDto, user.permissions);
      case ViewObservationQueryDTO.name:
        if (this.request.route.path === '/observations' || this.request.route.path === '/observations/count') {
          return this.handleMonitoringViewObservationQueryDTO(value as ViewObservationQueryDTO, user.permissions)
        } else if (this.request.route.path === '/observations/correction-data' || this.request.route.path === '/observations/count-correction-data') {
          return this.handleCorrectionViewObservationQueryDTO(value as ViewObservationQueryDTO, user.permissions);
        } else if (this.request.route.path === '/qc-check/count' || this.request.route.path === '/qc-check/count' || this.request.route.path === '/qc-check/perform-qc') {
          return this.handleQualityControlQueryDTO(value as ViewObservationQueryDTO, user.permissions);
        } else {
          throw new BadRequestException('Observations route path not authorised');
        }
      case StationStatusQueryDto.name:
        return this.handleMonitoringViewObservationQueryDTO(value as StationStatusQueryDto, user.permissions);
      case DataAvailabilitySummaryQueryDto.name:
        return this.handleMonitoringViewObservationQueryDTO(value as DataAvailabilitySummaryQueryDto, user.permissions);
      case DataFlowQueryDto.name:
        return this.handleMonitoringViewObservationQueryDTO(value as DataFlowQueryDto, user.permissions);
      case ViewObservationLogQueryDto.name:
        // TODO. Validate this based on entry, monitoring and qc permissions
        return value;
      case DeleteObservationDto.name:
        return this.handleCreateObservationQueryDto(value as CreateObservationDto, user.permissions);
      default:
        throw new BadRequestException('Could not determine how to authorize stations');
    }
  }

  private handleStationMetadataEdits(value: string, userPermissions: UserPermissionDto): string {
    if (!userPermissions.stationsMetadataPermissions) throw new BadRequestException('Not authorised to update station');

    // If allowed to update all stations then just return value
    if (!userPermissions.stationsMetadataPermissions.stationIds) return value;

    if (value && this.allAreAuthorisedStations([value], userPermissions.stationsMetadataPermissions.stationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access station(s)');
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

    if (value.stationIds) {
      if (!this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to correct station(s)');
      }
    } else {
      value.stationIds = authorisedStationIds;
    }

    return value;
  }

  private handleMonitoringViewObservationQueryDTO(value: ViewObservationQueryDTO | StationStatusQueryDto | DataAvailabilitySummaryQueryDto, userPermissions: UserPermissionDto): ViewObservationQueryDTO {
    if (!value) throw new BadRequestException('Query value must be defined');

    if (!userPermissions.ingestionMonitoringPermissions) throw new BadRequestException('Not authorised to monitor data');

    if (!userPermissions.ingestionMonitoringPermissions.stationIds) return value;

    const authorisedStationIds: string[] = userPermissions.ingestionMonitoringPermissions.stationIds;

    if (value.stationIds) {
      if (!this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to monitor station(s)');
      }
    } else {
      value.stationIds = authorisedStationIds;
    }
    return value;
  }

  private handleMonitoringString(value: string, userPermissions: UserPermissionDto): string {
    if (!userPermissions.ingestionMonitoringPermissions) throw new BadRequestException('Not authorised to monitor data');

    // If allowed to update all stations then just return value
    if (!userPermissions.ingestionMonitoringPermissions.stationIds) return value;

    if (value && this.allAreAuthorisedStations([value], userPermissions.ingestionMonitoringPermissions.stationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access station(s)');
    }
  }

  private handleQualityControlQueryDTO(value: ViewObservationQueryDTO, userPermissions: UserPermissionDto): ViewObservationQueryDTO {
    if (!value) throw new BadRequestException('Query value must be defined');

    if (!userPermissions.qcPermissions) throw new BadRequestException('Not authorised to QC');

    if (!userPermissions.qcPermissions.stationIds) return value;

    const authorisedStationIds: string[] = userPermissions.qcPermissions.stationIds;

    if (value.stationIds) {
      if (!this.allAreAuthorisedStations(value.stationIds, authorisedStationIds)) {
        throw new BadRequestException('Not authorised to QC station(s)');
      }
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
