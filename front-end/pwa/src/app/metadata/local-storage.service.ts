import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  
  constructor() {}

  // Save data to localStorage
 public setItem<V>(key: string, value: V): void {
    const jsonData = JSON.stringify(value);
    localStorage.setItem(key, jsonData);
  }

  // Retrieve data from localStorage
  public getItem<V>(key: string): V | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Remove an item from localStorage
  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Clear all localStorage data
  public clear(): void {
    localStorage.clear();
  }
}
