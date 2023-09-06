import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { EntryForm } from '../models/entryform.model';
import { EntryDataSource } from '../models/entrydatasource.model';
import { EntryData } from '../models/entrydata.model';
import { DataSelectorsValues } from '../../dataentry/form-entry/form-entry.component';
import { Element } from '../models/element.model';
import { Station } from '../models/station.model';

@Injectable({
  providedIn: 'root'
})
export class RepoService {

  constructor(public localStorage: LocalStorageService) { }


  private saveDataSources(dataSources: EntryDataSource[]): boolean {
    this.localStorage.setItem("data_sources", JSON.stringify(dataSources));
    return true;
  }


  //todo. this will be be done at the back end
  public saveDataSource(newDataSource: EntryDataSource): boolean {
    let dataSources: EntryDataSource[] = this.getDataSources();
    //let dataSources: EntryDataSource[] = [];

    if (newDataSource.id <= 0) {
      const lastDataSource = dataSources[dataSources.length - 1];
      newDataSource.id = lastDataSource ? lastDataSource.id + 1 : 1;
      dataSources.push(newDataSource);
    } else {
      const index = dataSources.findIndex(source => source.id === newDataSource.id);
      if (index !== -1) {
        dataSources[index] = newDataSource;
      }
    }

    return this.saveDataSources(dataSources);
  }


  public getDataSources(acquisitionTypeId?: number): EntryDataSource[] {
    const str: string | null = this.localStorage.getItem("data_sources");
    const dataSources: EntryDataSource[] = str ? JSON.parse(str) : [];

    if (acquisitionTypeId) {
      return dataSources.filter(dataSource => dataSource.acquisitionTypeId === acquisitionTypeId);
    }
    return dataSources;
  }

  public deleteDataSource(dataSourceId: number): boolean {
    const dataSources: EntryDataSource[] = this.getDataSources();
    const index = dataSources.findIndex(dataSource => dataSource.id === dataSourceId);

    if (index !== -1) {
      dataSources.splice(index, 1);
      return this.saveDataSources(dataSources);
    }

    return false;
  }

  public getDataSource(id: number): EntryDataSource {
    let dataSource!: EntryDataSource;
    let dataSources: EntryDataSource[] = this.getDataSources();
    dataSources.forEach(element => {
      if (element.id === id) {
        dataSource = element;
        return;
      }
    });

    return dataSource;
  }

  //todo
  // public getEntryForms(stationId: number): EntryForm[] {
  //   const dataSources: EntryDataSource[] = this.getDataSources(1);
  //   const entryForms: EntryForm[] = [];

  //   for (const dataSource of dataSources) {
  //     const entryForm: EntryForm = JSON.parse(dataSource.extraMetadata);
  //     entryForms.push(entryForm);
  //   }
  //   return entryForms;
  // }



  public getEntryDataItems(dataSelectorValues: DataSelectorsValues): EntryData[] {

    let allEntryDataItems: EntryData[] = this.getSavedEntryDataItems();
    let entryDataItems: EntryData[] = [];

    //todo. the below filter will happen at the server level
    for (const entryData of allEntryDataItems) {

      if (dataSelectorValues.dataSourceId > 0 && dataSelectorValues.dataSourceId !== entryData.dataSourceId) {
        continue;
      }

      if (dataSelectorValues.stationId != '0' && dataSelectorValues.stationId !== entryData.stationId) {
        continue;
      }

      if (dataSelectorValues.elementId > 0 && entryData.elementId !== dataSelectorValues.elementId) {
        continue;
      }

      const date: Date = new Date(entryData.datetime);
      if (dataSelectorValues.year > 0 && date.getFullYear() !== dataSelectorValues.year) {
        continue;
      }

      if (dataSelectorValues.month > 0 && date.getMonth() + 1 !== dataSelectorValues.month) {
        continue;
      }

      if (dataSelectorValues.day > 0 && date.getDate() !== dataSelectorValues.day) {
        continue;
      }

      if (dataSelectorValues.hour > -1 && date.getHours() !== dataSelectorValues.hour) {
        continue;
      }

      entryDataItems.push(entryData);

    }

    return entryDataItems;

  }

  private getSavedEntryDataItems(): EntryData[] {
    let entryDataItems: EntryData[] = []
    let str: any = this.localStorage.getItem("entry_data_items");
    if (str) {
      entryDataItems = JSON.parse(str)
    }
    return entryDataItems;
  }

  public saveEntryData(entryData: EntryData[]): boolean {
    //todo. this will also be done at the server level
    //let entryDataItems: EntryData[] = this.getSavedEntryDataItems();
    let entryDataItems: EntryData[] = [];

    //todo. check for uniqueness from the local data as well
    entryDataItems.push(...entryData);
    this.localStorage.setItem("entry_data_items", JSON.stringify(entryDataItems));
    return true;

  }

  public getElements(elementIds?: number[]): Element[] {
    const allElements: Element[] = [
      { id: 1, name: 'Minimum Temperature' },
      { id: 2, name: 'Maximum Temperature' },
      { id: 3, name: 'Rainfall' },
      { id: 4, name: 'Humidity' }
    ];

    const elements = elementIds ? allElements.filter(obj => elementIds.includes(obj.id)) : allElements;
    return elements;
  }

  public getStations(stationIds?: string[]): Station[] {
    const allStations: Station[] = [
      { id: '1', name: 'JKIA Airport' },
      { id: '2', name: 'KMD Headquarters' },
      { id: '3', name: 'ICPAC Main' },
      { id: '4', name: 'KALRO Machakos' }];
    const stations = stationIds ? allStations.filter(obj => stationIds.includes(obj.id)) : allStations;
    return stations;
  }



}
