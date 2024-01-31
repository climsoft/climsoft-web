import { ArgumentMetadata, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AuthorisedStationsPipe implements PipeTransform {

  constructor( @Inject(REQUEST) private readonly request: Request){
    //console.log('session', session);
    console.log('initialsed')
    
  }


  transform(value: any, metadata: ArgumentMetadata) {
    console.log('value', value)
    console.log('metadata', metadata)
    console.log('session', this.request.session)

    //todo. do validation
    return value;
  }
}
