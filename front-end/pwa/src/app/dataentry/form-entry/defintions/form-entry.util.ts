import { ObservationDefinition } from './observation.definition';

export class FormEntryUtil {

  public static getTotalValuesOfObs(obsDefs: ObservationDefinition[]): number | null {
    let total = 0;
    let allAreNull: boolean = true;

    for (const obsDef of obsDefs) {
      const scaledValue = obsDef.getScaledValue()
      if (scaledValue !== null) {
        total = total + scaledValue;
        allAreNull = false;
      }
    }

    return allAreNull ? null : total;

  }

 



}
