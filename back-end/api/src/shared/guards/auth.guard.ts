import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { IS_ADMIN_KEY } from '../decorators/admin.decorator';
import { UserRole } from 'src/user/enums/user-roles.enum';


@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    // If route handler is public then no need to validate if user is logged in.
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler());
    if (isPublic) {
      return true;
    }

    // If only user role admin allowed to access the route handler then check if the user logged in is admin
    // and allow router handler access if logged in user is admin.
    const isAdmin = this.reflector.get(IS_ADMIN_KEY, context.getHandler());
    const session: Record<string, any> = context.switchToHttp().getRequest<Request>().session;
    if (isAdmin && session.user) {
      return (session.user as UserEntity).roleId === UserRole.Administrator;
    } else {
      return !!session.user;
    }
  }
}
