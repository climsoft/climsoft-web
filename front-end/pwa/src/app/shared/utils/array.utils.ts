export class ArrayUtils {

  static getMapWithNumbersAsKeys<T>(arrItems: T[], idProp: keyof T, nameProp: keyof T): Map<number, string> {
    const mapItems:Map<number, string> = new Map<number, string>();
    for (const item of arrItems) {
      mapItems.set(Number(item[idProp]), String(item[nameProp]) );
    }
    return mapItems;
  }

  static findIndexOfKey<K, V>(map: Map<K, V>, keyToFind: K): number {
    let index = 0;
    for (const key of map.keys()) {
      if (key === keyToFind) {
        return index;
      }
      index++;
    }
    return -1; // Return -1 if the key is not found
  }


  static getTuppleWithNumbersAsKeys<T>(arrItems: T[], idProp: keyof T, nameProp: keyof T): [number, string][] {
    const tuppleItems:[number, string][] = [];
    for (const item of arrItems) {
      tuppleItems.push([Number(item[idProp]), String(item[nameProp]) ]);
    }
    return tuppleItems;
  }

  static findDataItems(dataItems: { [key: string]: any }[], dataItem: any[], property: string): any[] {
    return dataItem
      .map((valueItem) => ArrayUtils.findDataItem(dataItems, valueItem, property))
      .filter((item) => item !== undefined);
  }

  //dataItem should NOT be an array
  //returns found value or undefined 
  static findDataItem(dataItems: { [key: string]: any }[], dataItem: any, property: string): any {
    if (typeof dataItem === 'object') {
      return dataItems.find((fetchedItem) => fetchedItem[property] === dataItem[property]);
    } else {
      return dataItems.find((fetchedItem) => fetchedItem[property] === dataItem);
    }
  }

}