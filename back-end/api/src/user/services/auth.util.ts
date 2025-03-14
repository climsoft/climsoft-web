import { Request } from 'express';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { NotFoundException } from '@nestjs/common';
import { ViewUserDto } from '../dtos/view-user.dto';

export class AuthUtil {

    public static createNewSessionUser(request: Request, userEntity: ViewUserDto): LoggedInUserDto {
        //if user found then set the user session  
        const expiresIn: number = request.session.cookie.maxAge ? request.session.cookie.maxAge : 0
        const loggedInUser: LoggedInUserDto = {
            id: userEntity.id,
            username: userEntity.email,
            isSystemAdmin: userEntity.isSystemAdmin,
            permissions: userEntity.permissions,
            expiresIn: expiresIn,
        };


        //TODO. Instead of type assertion, 
        // in future extend the Session class of express session module?.
        // This helps if user is accessed in multiple places
        // interface ExtendedSession extends Session {
        //     user?: LoggedInUser; 
        //   }

        (request.session as any).user = loggedInUser;

        return loggedInUser
    }

    public static sessionUserIsAdmin(request: Request): boolean {
        const user = AuthUtil.getSessionUser(request);
        return user ? user.isSystemAdmin : false;
    }

    public static getLoggedInUserId(request: Request): number {
        return AuthUtil.getLoggedInUser(request).id
    }

    public static getLoggedInUser(request: Request): LoggedInUserDto {
        const user = AuthUtil.getSessionUser(request);
        if (!user) {
            // TODO. Throw the correct error?
            throw new NotFoundException(`User not logged in`);
        }
        return user
    }

    public static getSessionUser(request: Request): LoggedInUserDto | null {
        const session: any = request.session
        return session.user ? session.user as LoggedInUserDto : null;
    }
}
