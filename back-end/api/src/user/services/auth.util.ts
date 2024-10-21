import { Request } from 'express';
import { LoggedInUserModel } from 'src/user/model/logged-in-user.model';
import { UserRoleEnum } from '../enums/user-roles.enum';
import { NotFoundException } from '@nestjs/common';
import { ViewUserDto } from '../dtos/view-user.dto';


export class AuthUtil {

    public static createNewSessionUser(request: Request, userEntity: ViewUserDto): LoggedInUserModel {
        //if user found then set the user session  
        const authorisedStationIds: string[] | null = userEntity.authorisedStationIds ? userEntity.authorisedStationIds : null;
        const expiresIn: number = request.session.cookie.maxAge ? request.session.cookie.maxAge : 0
        const loggedInUser: LoggedInUserModel = {
            id: userEntity.id,
            role: userEntity.role,
            authorisedStationIds: authorisedStationIds,
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
        return user ? user.role === UserRoleEnum.ADMINISTRATOR : false;
    }

    public static getLoggedInUserId(request: Request): number  {
        return AuthUtil.getLoggedInUser(request).id
    }

    public static getLoggedInUser(request: Request): LoggedInUserModel  {
        const user = AuthUtil.getSessionUser(request);
        if(!user){
            // TODO. Throw the correct error?
            throw  new NotFoundException(`User not logged in`);
        }
        return user
    }
  
    public static getSessionUser(request: Request): LoggedInUserModel | null {
        const session: any = request.session
        return session.user ? session.user as LoggedInUserModel : null;
    }

  

}
