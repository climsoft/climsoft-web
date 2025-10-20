import { HttpClient, HttpParams } from "@angular/common/http";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { catchError, concatMap, from, Observable, of } from "rxjs";
import { Injectable } from "@angular/core";
import { AppDatabase } from "src/app/app-database";
import { MetadataUpdatesQueryModel } from "./metadata-updates-query.model";
import { MetadataUpdatesResponseModel } from "./metadata-updates-response.model";
import { AppConfigService } from "src/app/app-config.service";
import { AppAuthInterceptor } from "src/app/app-auth.interceptor";

@Injectable({
    providedIn: 'root'
})
export class MetadataUpdatesService {
    private endPointUrl: string;

    constructor(private appConfigService: AppConfigService, private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/metadata-updates`;
    }

    public checkUpdates(tableName: keyof AppDatabase) {
        return of(null).pipe(
            concatMap(() => from(this.getMetadataUpdatesQuery(tableName))),
            concatMap(metadataUpdatesQuery => this.getUpdatesFromServer(tableName, metadataUpdatesQuery)),
            concatMap(serverResponse => from(this.saveResponseFromServer(tableName, serverResponse)))
        );
    }

    private async getMetadataUpdatesQuery(tableName: keyof AppDatabase): Promise<MetadataUpdatesQueryModel> {
        const lastModifiedDate = (await AppDatabase.instance.metadataModificationLog.get(tableName))?.lastModifiedDate;
        const lastModifiedCount = await AppDatabase.count(tableName);
        const query: MetadataUpdatesQueryModel = { lastModifiedCount: lastModifiedCount, lastModifiedDate: lastModifiedDate };
        return query;
    }

    private getUpdatesFromServer(tableName: keyof AppDatabase, query: MetadataUpdatesQueryModel): Observable<MetadataUpdatesResponseModel> {
        //console.log("fetching metadata updates: ", ' tableName: ', tableName, ' lastModifiedDate: ', lastModifiedDate, ' lastModifiedCount: ', lastModifiedCount);
        let httpParams: HttpParams = StringUtils.getQueryParams(query);
        return this.http.get<MetadataUpdatesResponseModel>(`${this.endPointUrl}/${this.getUpdateRouteParam(tableName)}`, { params: httpParams })
            .pipe(
                catchError(AppAuthInterceptor.handleError)
            );
    }

    private async saveResponseFromServer(tableName: keyof AppDatabase, response: MetadataUpdatesResponseModel): Promise<boolean> {
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
            case 'regions':
                return 'regions';
            case 'organisations':
                return 'organisations';
            case 'networkAffiliations':
                return 'network-affiliations';
            case 'stations':
                return 'stations';
            case 'stationObsEnv':
                return 'station-observation-environments';
            case 'stationObsFocus':
                return 'station-observation-focuses';
            case 'elementSubdomains':
                return 'element-subdomains';
            case 'elementTypes':
                return 'element-types';
            case 'elements':
                return 'elements';
            case 'qcTests':
                return 'qc-tests';
            case 'sourceTemplates':
                return 'source-templates';
            case 'generalSettings':
                return 'general-settings';
            default:
                throw new Error('Developer error: metadata name not recognised');
        }
    }
}