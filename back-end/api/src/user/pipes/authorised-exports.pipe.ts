import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util'; 

@Injectable()
export class AuthorisedExportsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('exports meta name: ', metadata.metatype?.name,  ' | Path: ', this.request.route.path, ' | value: ', value)

    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // user is not admin and has no permissions then throw error
    if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    // If user has no export permissions then throw not authorised error
    if (!user.permissions.exportPermissions) throw new BadRequestException('Not authorised to export sata');

    // If user is allowed to export using any template then just return value requested
    if (!user.permissions.exportPermissions.exportTemplateIds) return value;

    // Ensure metatype is available
    if (!metadata.metatype) {
      throw new BadRequestException('Could not determine how to authorize exports');
    }

    const authorisedExportIds: number[] = user.permissions.exportPermissions.exportTemplateIds;

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array':
        return this.handleArray(value, authorisedExportIds);
      case 'Number':
        return this.handleNumber(value, authorisedExportIds);
      default:
        throw new BadRequestException('Could not determine how to authorize exports');
    }
  }

  private handleArray(value: number[], authorisedExportIds: number[]): number[] {
    if (value) {
      if (!this.allAreAuthorisedExports(value, authorisedExportIds)) {
        throw new BadRequestException('Not authorised to access the exports');
      }
    } else {
      value = authorisedExportIds;
    }
    return value;
  }

  private handleNumber(value: number, authorisedExportIds: number[]): number {
    if (value && this.allAreAuthorisedExports([value], authorisedExportIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access the export');
    }
  }


  private allAreAuthorisedExports(requestedIds: number[], authorisedIds: number[]): boolean {
    return requestedIds.every(id => authorisedIds.includes(id));
  }
}
