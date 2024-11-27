import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { BehaviorSubject, catchError, concatMap, from, map, Observable, of, switchMap, take, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { AppDatabase } from "src/app/app-database";
import { MetadataUpdatesQueryModel } from "./metadata-updates-query.model";
import { MetadataUpdatesResponseModel } from "./metadata-updates-response.model";

@Injectable({
    providedIn: 'root'
})
export class MetadataUpdatesService {
    private endPointUrl: string = `${environment.apiUrl}/metadata-updates`;

    constructor(private http: HttpClient) {
    }

    public checkUpdates(tableName: keyof AppDatabase) {
       return of(null).pipe(
            concatMap (() => from(this.getMetadataUpdatesQuery(tableName))), 
            concatMap(metadataUpdatesQuery => this.getUpdatesFromServer(tableName, metadataUpdatesQuery)),
            concatMap(serverResponse => from(this.saveResponseFromServer(tableName, serverResponse)))
        );
    }

    private async getMetadataUpdatesQuery(tableName: keyof AppDatabase): Promise<MetadataUpdatesQueryModel> {
        const lastModifiedDate = (await AppDatabase.instance.metadataModificationLog.get(tableName))?.lastModifiedDate;
        const lastModifiedCount = await AppDatabase.count(tableName);
        const query: MetadataUpdatesQueryModel = { lastModifiedCount: lastModifiedCount, lastModifiedDate: lastModifiedDate };
        return query
    }

    private getUpdatesFromServer(tableName: keyof AppDatabase, query: MetadataUpdatesQueryModel): Observable<MetadataUpdatesResponseModel> {
        //console.log("fetching metadata updates: ", ' tableName: ', tableName, ' lastModifiedDate: ', lastModifiedDate, ' lastModifiedCount: ', lastModifiedCount);
        let httpParams: HttpParams = StringUtils.getQueryParams(query);
        return this.http.get<MetadataUpdatesResponseModel>(`${this.endPointUrl}/${this.getUpdateRouteParam(tableName)}`, { params: httpParams })
            .pipe(
                catchError(this.handleError)
            );
    }

    private async saveResponseFromServer(tableName: keyof AppDatabase, response : MetadataUpdatesResponseModel): Promise<boolean>{
        let saved: boolean = false;
        if (response && response.metadataChanged && response.metadataRecords) {
            saved = await this.updateMetadataInDB(tableName, response.metadataRecords);
        }
        //return of(saved);
        return saved;
    }
    
    private async updateMetadataInDB(tableName: keyof AppDatabase, records: any[]): Promise<boolean> {
        try {
            // clear all
            await AppDatabase.clear(tableName);

            // Then add all
            if (records.length > 0) {
                await AppDatabase.bulkPut(tableName, records);
            }

            // Update the updates table
            await AppDatabase.instance.metadataModificationLog.put({ metadataName: tableName, lastModifiedDate: new Date().toISOString() });

            return true;
        } catch (error) {
            console.error('Error in saving metadata: ', error);
            return false;
        }
    }

    private getUpdateRouteParam(tableName: keyof AppDatabase): string {
        switch (tableName) {
            case 'stations':
                return 'stations';
            case 'stationObsEnv':
                return 'station-observation-environments';
            case 'stationObsFocus':
                return 'station-observation-focuses';
            case 'elements':
                return 'elements';
            case 'sources':
                return 'sources';
            case 'regions':
                return 'regions';
            default:
                console.error('Developer error: metadata name not recognised');
                throw new Error('Developer error: metadata name not recognised');
        }

    }

    private handleError(error: HttpErrorResponse) {
        //console.log('auth error', error)
        if (error.status === 0) {
            // A client-side or network error occurred. Handle it accordingly.
            console.error('An error occurred:', error.error);
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong.
            console.error(`Backend returned code ${error.status}, body was: `, error.error);
        }
        // Return an observable with a user-facing error message.
        return throwError(() => new Error('Something bad happened. please try again later.'));
    }
}