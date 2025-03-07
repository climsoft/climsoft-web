import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'; 
import { AppConfigService } from 'src/app/app-config.service';
import { ViewUserGroupModel } from '../models/view-user-group.model';
import { CreateUserGroupModel } from '../models/create-user-group.model';

@Injectable({
  providedIn: 'root'
})
export class UserGroupsService {
  private endPointUrl: string  ;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/user-groups`;
  }

  public findAll(): Observable<ViewUserGroupModel[]> {
    return this.http.get<ViewUserGroupModel[]>(this.endPointUrl);
  }

  public findOne(userId: number): Observable<ViewUserGroupModel> {
    return this.http.get<ViewUserGroupModel>(`${this.endPointUrl}/${userId}`);
  }

  public create(createUserDto: CreateUserGroupModel): Observable<ViewUserGroupModel> {
    return this.http.post<ViewUserGroupModel>(`${this.endPointUrl}/create`, createUserDto);
  }

  public update(userId: number, createUserDto: CreateUserGroupModel): Observable<ViewUserGroupModel> {
    return this.http.patch<ViewUserGroupModel>(`${this.endPointUrl}/update/${userId}`, createUserDto);
  }

}
