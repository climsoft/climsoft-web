import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewElementModel } from '../../models/elements/view-element.model';
import { UpdateElementModel } from '../../models/elements/update-element.model';
import { CreateElementModel } from '../../models/elements/create-element.model';
import { ElementDomainEnum } from '../../models/elements/element-domain.enum';
import { ViewElementSubdomainModel } from '../../models/elements/view-element-subdomain.model';
import { ViewElementTypeModel } from '../../models/elements/view-element-type.model';
import { BaseAPIService } from '../base/base-api.service';
import { BaseNumberAPIService } from '../base/base-number-api.service';

@Injectable({
  providedIn: 'root'
})
export class ElementsService extends BaseNumberAPIService< CreateElementModel, UpdateElementModel, ViewElementModel> {

  constructor(private http: HttpClient) { 
    super(http,'elements')
  }

}
