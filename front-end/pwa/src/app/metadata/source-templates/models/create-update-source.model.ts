import { SourceTypeEnum } from "./source-type.enum";

export interface CreateUpdateSourceModel {
  name: string;
  description: string;
  sourceType: SourceTypeEnum;
  parameters: SourceParametersValidity; //json

  /** 
 * Determines whether entry date time should be converted to UTC or not. 
 * If true, the entry date time will be sent to the server based on date time selection on the lcient
 * If false, entry date time will be converted to UTC before being sent to sever
 */
  utcOffset: number;

  /**
   * Determines whether to allow missing values or not.
   * If true, entry of missing values will be allowed.
   */
  allowMissingValue: boolean;

  /**
* Determines whether to scale the values. 
* To be used when data being imported is not scaled
*/
  scaleValues: boolean;

  /** Sample paper image that resembles the source design */
  sampleImage: string;

  disabled: boolean;
  comment: string | null;
}

export interface SourceParametersValidity {
  isValid(): boolean;
}