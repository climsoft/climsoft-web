import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_ADMIN_KEY } from '../decorators/admin.decorator';
import { UserRoleEnum } from 'src/user/enums/user-roles.enum';
import { LoggedInUserModel } from 'src/user/model/logged-in-user.model';
import { AuthUtil } from '../services/auth.util';


@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector,
  ) {
  
   }

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
    const user: LoggedInUserModel | null = AuthUtil.getSessionUser(context.switchToHttp().getRequest<Request>())

    return user && isAdmin?  user.role === UserRoleEnum.ADMINISTRATOR : !!user;

  }
}
