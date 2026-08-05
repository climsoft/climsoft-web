import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { CreateUpdateProductModel, ProductGuestTokenModel, ViewProductModel } from '../models/view-product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
    private readonly endPointUrl: string;

    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly http: HttpClient,
    ) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/products`;
    }

    public findAll(): Observable<ViewProductModel[]> {
        return this.http.get<ViewProductModel[]>(this.endPointUrl);
    }

    public findAllAdmin(): Observable<ViewProductModel[]> {
        return this.http.get<ViewProductModel[]>(`${this.endPointUrl}/all`);
    }

    public findOne(id: number): Observable<ViewProductModel> {
        return this.http.get<ViewProductModel>(`${this.endPointUrl}/${id}`);
    }

    public getGuestToken(id: number): Observable<ProductGuestTokenModel> {
        return this.http.get<ProductGuestTokenModel>(`${this.endPointUrl}/${id}/guest-token`);
    }

    public create(dto: CreateUpdateProductModel): Observable<ViewProductModel> {
        return this.http.post<ViewProductModel>(this.endPointUrl, dto);
    }

    public update(id: number, dto: CreateUpdateProductModel): Observable<ViewProductModel> {
        return this.http.patch<ViewProductModel>(`${this.endPointUrl}/${id}`, dto);
    }

    public deleteProduct(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`);
    }
}
