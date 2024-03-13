import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';  
import { ViewUserModel } from '../models/view-user.model';
import { CreateUserModel } from '../models/create-user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private endPointUrl: string = " http://localhost:3000/users";

  constructor(private http: HttpClient) { }

  getUsers(): Observable<ViewUserModel[]> {
  
    //todo. load slected elements
    return this.http.get<ViewUserModel[]>(this.endPointUrl);
  }

  getUser(userId: string): Observable<CreateUserModel> {
    return this.http.get<CreateUserModel>(`${this.endPointUrl}/${userId}`);
  }

  create(createUserDto: CreateUserModel): Observable<CreateUserModel> {
    return this.http.post<CreateUserModel>(`${this.endPointUrl}/create`, createUserDto);
  }

  update(userId: number, createUserDto: CreateUserModel): Observable<CreateUserModel> {
    return this.http.patch<CreateUserModel>(`${this.endPointUrl}/update/${userId}`, createUserDto);
  }

 



}
