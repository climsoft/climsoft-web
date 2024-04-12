import { take } from "rxjs";
import { EntryForm } from "src/app/core/models/entry-form.model";
import { ViewElementModel } from "src/app/core/models/view-element.model";
import { ElementsService } from "src/app/core/services/elements.service";

export class FormEntryDefinition {
    stationId: string;
    sourceId: number;
    formMetadata: EntryForm;
    elementSelectorValue: number | null;
    yearSelectorValue: number;
    monthSelectorValue: number;
    daySelectorValue: number | null;
    hourSelectorValue: number | null;

    /** Elements required for data entry. Th */
    elements: ViewElementModel[];

    constructor(stationId: string, sourceId: number, formMetadata: EntryForm) {
        this.stationId = stationId;
        this.sourceId = sourceId;
        this.formMetadata = formMetadata;
        this.elementSelectorValue = formMetadata.selectors.includes('ELEMENT') ? formMetadata.elementIds[0] : null;
        const todayDate: Date = new Date();
        this.yearSelectorValue = todayDate.getFullYear();
        this.monthSelectorValue = todayDate.getMonth() + 1;
        this.daySelectorValue = formMetadata.selectors.includes('DAY') ? todayDate.getDate() : null;
        this.hourSelectorValue = formMetadata.selectors.includes('HOUR') ? formMetadata.hours[0] : null;
        this.elements = [];
    }

    public get elementValuesForDBQuerying(): number[] {
        return this.elementSelectorValue ? [this.elementSelectorValue] : this.formMetadata.elementIds;
    }

    public get hourValuesForDBQuerying(): number[] {
        return this.hourSelectorValue !== null ? [this.hourSelectorValue] : this.formMetadata.hours;
    }

    public loadElementMetadata(elementsService: ElementsService) {
        // TODO.
    }


}