
import { Request } from 'express';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserRole } from '../enums/user-roles.enum';


export class AuthUtil {


    public static getSessionUser(request: Request):  LoggedInUserDto | null  {
        const session: any = request.session

        return session.user? session.user as LoggedInUserDto  : null;
    }

    public static createNewSessionUser(request: Request, userEntity: UserEntity): LoggedInUserDto {
        //if user found then set the user session  
        const authorisedStationIds: string[] | null = userEntity.authorisedStationIds ? userEntity.authorisedStationIds : null;
        const expiresIn: number = request.session.cookie.maxAge ? request.session.cookie.maxAge : 0
        const loggedInUser: LoggedInUserDto = {
            id: userEntity.id,
            roleId: userEntity.roleId,
            authorisedStationIds: authorisedStationIds,
            expiresIn: expiresIn,
        };

        //TODO. Instead of type assertion, in future extend the Session class of express session module?.
        // This helps if user is accessed in multiple places
        // interface ExtendedSession extends Session {
        //     user?: LoggedInUser; 
        //   }

        (request.session as any).user = loggedInUser;

        return loggedInUser
    }

    public static sessionUserIsAdmin(request: Request): boolean {
        const user = AuthUtil.getSessionUser(request);
        return user? user.roleId === UserRole.Administrator: false;       
    }

}
