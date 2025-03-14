import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';

@Injectable()
export class AuthorisedImportsPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: Request) { }

  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('imports meta name: ', metadata.metatype?.name, ' | Path: ', this.request.route.path, ' | value: ', value)

    const user = AuthUtil.getSessionUser(this.request);

    // If user is not logged in, return the value. Authorization will be handled by authentication guard.
    if (!user) return value;

    // If user is admin return the value.
    if (AuthUtil.sessionUserIsAdmin(this.request)) return value;

    // If user is not admin and has no permissions then throw error
    if (!user.permissions) throw new BadRequestException('Could not check for permissions');

    // If useris not allowed to enter data then throw error
    if (!user.permissions.entryPermissions) throw new BadRequestException('Not authorised to enter data');

    // If user has no export permissions then throw not authorised error
    if (!user.permissions.entryPermissions.importPermissions) throw new BadRequestException('Not authorised to export data');

    // If user is allowed to export using any template then just return value requested
    if (!user.permissions.entryPermissions.importPermissions.importTemplateIds) return value;

    // Ensure metatype is available
    if (!metadata.metatype) {
      throw new BadRequestException('Could not determine how to authorize exports');
    }

    const authorisedImportIds: number[] = user.permissions.entryPermissions.importPermissions.importTemplateIds;

    // Handle different types of metatype
    switch (metadata.metatype.name) {
      case 'Array':
        return this.handleArray(value, authorisedImportIds);
      case 'Number':
        return this.handleNumber(value, authorisedImportIds);
      default:
        throw new BadRequestException('Could not determine how to authorize imports');
    }
  }

  private handleArray(value: number[], authorisedImportIds: number[]): number[] {
    if (value) {
      if (!this.allAreAuthorisedExports(value, authorisedImportIds)) {
        throw new BadRequestException('Not authorised to access the imports');
      }
    } else {
      value = authorisedImportIds;
    }
    return value;
  }

  private handleNumber(value: number, authorisedImportIds: number[]): number {
    if (value && this.allAreAuthorisedExports([value], authorisedImportIds)) {
      return value;
    } else {
      throw new BadRequestException('Not authorised to access the import');
    }
  }


  private allAreAuthorisedExports(requestedIds: number[], authorisedIds: number[]): boolean {
    return requestedIds.every(id => authorisedIds.includes(id));
  }
}
