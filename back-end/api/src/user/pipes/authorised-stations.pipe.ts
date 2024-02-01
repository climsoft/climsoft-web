import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthUtil } from '../services/auth.util';

@Injectable()
export class AuthorisedStationsPipe implements PipeTransform {

  // TODO. Not sure if this is an acceptable way of getting the request object froom a pipe.
  // Check if there are better ways of getting the request object or in this case the session in a pipe.
  constructor( @Inject(REQUEST) private readonly request: Request){  
  }


  public transform(value: any, metadata: ArgumentMetadata) {

    console.log('metadata', metadata);
    //console.log('session', this.request.session)

    const user =  AuthUtil.getSessionUser(this.request);
    if(!user){
      return value;    
    }


    // Admins are allowed to access all or any station
    // Users that don't have authorised stations are also allowed to access all or any station
    if(AuthUtil.sessionUserIsAdmin(this.request) || !user.authorisedStationIds){
      return value;
    }


    if(metadata.metatype === Array){

      if(value && value.length>0 ){

        if(this.requestedStationsAreValid(value, user.authorisedStationIds)){
          console.log('all ids valid');
          return value;
        }else{
          throw new BadRequestException();
        }

      }else{
        return user.authorisedStationIds;
      }


      //console.log('array of strings!')
    }



    //todo. do validation
    return value;
  }

private requestedStationsAreValid( requestedIds: string[], authorisedIds: string[]): boolean{


  for(const id of requestedIds){
    if(!authorisedIds.includes(id)){
      return false;
    }
  }

  return true;

}

}
