import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';
import { UserPermissionDto } from '../dtos/user-permission.dto';

@Injectable()
export class AuthorisedExportsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('exports meta name: ', metadata.metatype?.name)


    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // user is not admin and has no permissions then throw error
    if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    // Ensure metatype is available
    if (!metadata.metatype) {
      throw new BadRequestException('Could not determine how to authorize exports');
    }

    const authorisedStationIds: any = [];

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array': 
      return this.handleArray(value, authorisedStationIds); 
      case 'Number':
        return this.handleNumber(value, authorisedStationIds); 
      default: 
        throw new BadRequestException('Could not determine how to authorize exports');
    }
  }

  private handleArray(value: number[],  userPermissions: UserPermissionDto): number[] {
    if (!userPermissions.exportPermissions) throw new BadRequestException('Not authorised to export data');

    if (!userPermissions.exportPermissions.exportTemplateIds) return value;

    const authorisedExportIds: number[] = userPermissions.exportPermissions.exportTemplateIds;
    if (value) {
      if (!this.allAreAuthorisedExports(value, authorisedExportIds)) {
        throw new BadRequestException('Not authorised to access exports');
      }
    } else {
      value = authorisedExportIds;
    }
    return value;
  }

  private handleNumber(value: number, authorisedStationIds: number[]): number {
    if (value && this.allAreAuthorisedExports([value], authorisedStationIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access export');
    }
  }
 

  private allAreAuthorisedExports(requestedIds: number[], authorisedIds: number[]): boolean {
    return requestedIds.every(id => authorisedIds.includes(id));
  }
}
