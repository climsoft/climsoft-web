export class ArrayUtils {

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