import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ControlDefinition } from '../value-flag-input/value-flag-input.component';
import { FormEntryService } from '../../form-entry/form-entry.service';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';



@Component({
  selector: 'app-list-layout',
  templateUrl: './list-layout.component.html',
  styleUrls: ['./list-layout.component.scss']
})
export class ListLayoutComponent implements OnInit, OnChanges {

  @Input() elements!: ElementModel[];
  @Input() dataSelectors!: DataSelectorsValues;
  @Input() formMetadata!: EntryForm;
  @Input() observations!: ObservationModel[];
  @Input() flags!: FlagModel[];
  @Output() valueChange = new EventEmitter<ObservationModel>();

  public controlsDefinitions!: ControlDefinition[];
  public controlsDefinitionsChuncks!: ControlDefinition[][];
  public largeScreen: boolean = false;

  constructor(private viewPortService: ViewportService,
    private formEntryService: FormEntryService) {

    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.Large;
    });

  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.observations && this.elements && this.elements.length > 0 &&
      this.dataSelectors &&
      this.formMetadata &&
      this.flags && this.flags.length > 0) {

      // Get the new definitions 
      this.controlsDefinitions = this.createNewControlDefinitions(this.dataSelectors, this.elements,this.formMetadata, this.observations);
      this.controlsDefinitionsChuncks = this.getControlDefinitionsChuncks(this.controlsDefinitions);
    }


  }


  private createNewControlDefinitions(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): ControlDefinition[] {
    let controlsDefinitions: ControlDefinition[] = [];
    //get entry field to use for control definitions
    const entryField: string = formMetadata.entryFields[0];

    switch (entryField) {
      case "elementId":
        //create controls definitions for the selected elements only
        controlsDefinitions = this.getNewControlDefs(dataSelectors,formMetadata.entryFields,elements, "id", "abbreviation");
        break;
      case "day":
        //create controls definitions for days of the selected month only
        //note, there is no days selection in the form builder
        controlsDefinitions = this.getNewControlDefs(dataSelectors,formMetadata.entryFields,DateUtils.getDaysInMonthList(dataSelectors.year, dataSelectors.month), "id", "name");
        break;
      case "hour":
        //create control definitions for the selected hours only
        //note there is always hours selection in the form builder
        controlsDefinitions = this.getNewControlDefs(dataSelectors,formMetadata.entryFields,formMetadata.hours.length > 0 ? DateUtils.getHours(formMetadata.hours) : DateUtils.getHours(), "id", "name");
        break;
      default:
        //Not supported
        //todo. display error in set up
        break;
    }

    //set control definitions entry data from the loaded data
    this.setExistingObservationsToControlDefinitions(controlsDefinitions, observations);
    return controlsDefinitions;
  }

  //gets an array of control definitions from the passed array
  private getNewControlDefs( dataSelectors: DataSelectorsValues, formEntryFields: string[],entryFieldItems: any[], valueProperty: string, displayProperty: string): ControlDefinition[] {

    const controlDefintions: ControlDefinition[] = [];
    for (const item of entryFieldItems) {
      controlDefintions.push({
        label: item[displayProperty],
        entryData: this.formEntryService.getNewEntryData(dataSelectors, formEntryFields, [item[valueProperty]]),
        newData: true,
        userChange: false,
      });
    }
    return controlDefintions;
  }

  private setExistingObservationsToControlDefinitions(controlsDefintions: ControlDefinition[], observations: ObservationModel[]): void {

    for (const observation of observations) {

      for (const controlDef of controlsDefintions) {

        // Look for the observation element id and date time.
        // The other criteria is taken care of by data selectors; station and source id

        // Todo. confirm this check for duplicates. 
        // For instance when level and period is not part of the data selector
        if (controlDef.entryData.elementId === observation.elementId && controlDef.entryData.datetime === observation.datetime) {
          controlDef.entryData = observation;
          controlDef.newData = false;
        }

      }

    }

  }


  public onValueChange(controlDefinition: ControlDefinition): void {
    this.valueChange.emit(controlDefinition.entryData);
  }


  private getControlDefinitionsChuncks(controlsDefinitions: ControlDefinition[]): ControlDefinition[][] {

    console.log("getting chunks")

    const chunks: ControlDefinition[][] = [];
    const chunkSize = 5;
    for (let i = 0; i < this.controlsDefinitions.length; i += chunkSize) {
      chunks.push(controlsDefinitions.slice(i, i + chunkSize));
    }
    return chunks;
  }


}
