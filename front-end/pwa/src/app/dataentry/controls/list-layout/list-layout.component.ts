import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ControlDefinition } from '../value-flag-input/value-flag-input.component';
import { FieldDefinition, FormEntryService } from '../../form-entry/form-entry.service';
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
      this.controlsDefinitions = this.createNewControlDefinitions(this.dataSelectors, this.elements, this.formMetadata, this.observations);
      this.controlsDefinitionsChuncks = this.getControlDefinitionsChuncks(this.controlsDefinitions);
    }


  }


  private createNewControlDefinitions(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): ControlDefinition[] {

    //get entry field to use for control definitions
    const entryField: string = formMetadata.entryFields[0];
    let fieldDefinitions: FieldDefinition[];

    switch (entryField) {
      case "elementId":
        //create field definitions for the selected elements only
        fieldDefinitions = this.formEntryService.getFieldDefinitionItems(elements, "id", "abbreviation")
        break;
      case "day":
        //create field definitions for days of the selected month only
        //note, there is no days selection in the form builder
        fieldDefinitions = this.formEntryService.getFieldDefinitionItems(DateUtils.getDaysInMonthList(dataSelectors.year, dataSelectors.month), "id", "name")
        break;
      case "hour":
        //create field definitions for the selected hours only
        //note there is always hours selection in the form builder
        fieldDefinitions = this.formEntryService.getFieldDefinitionItems(formMetadata.hours.length > 0 ? DateUtils.getHours(formMetadata.hours) : DateUtils.getHours(), "id", "name")
        break;
      default:
        //Not supported
        //todo. display error in set up
        return [];
    }

    //set control definitions 
    const controlsDefinitions: ControlDefinition[] = this.formEntryService.getNewControlDefs1(
      dataSelectors, { obsFieldProperty: entryField, obsFieldValues: fieldDefinitions.map(data => (data.id)) });

      //set existing observations to the control definitions
    this.formEntryService.setExistingObsToControlDefs(controlsDefinitions, observations);
    
    //set labels for the control definitions
    this.setLabels(controlsDefinitions, fieldDefinitions, entryField)

    return controlsDefinitions;
  }


  private setLabels(controlsDefinitions: ControlDefinition[], fieldDefinitions: FieldDefinition[], entryField: string) {

    for (const controlDef of controlsDefinitions) {
      let label: string = '';
      for (const fieldDef of fieldDefinitions) {

        if (entryField === "elementId") {
          if (controlDef.entryData.elementId == fieldDef.id) {
            label = fieldDef.name;
          }
        } else if (entryField === "day") {
          if (DateUtils.getDayFromSQLDate(controlDef.entryData.datetime) == fieldDef.id) {
            label = fieldDef.name;
          }
        } else if (entryField === "hour") {
          if (DateUtils.getHourFromSQLDate(controlDef.entryData.datetime) == fieldDef.id) {
            label = fieldDef.name;
          }
        }

        if (label) {
          break;
        }

      }

      if (label) {
        controlDef.label = label;
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
