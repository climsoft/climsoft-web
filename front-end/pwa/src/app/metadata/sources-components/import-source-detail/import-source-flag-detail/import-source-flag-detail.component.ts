import { Component, Input } from '@angular/core';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { FlagDefinition } from 'src/app/core/models/sources/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-flag-detail',
  templateUrl: './import-source-flag-detail.component.html',
  styleUrls: ['./import-source-flag-detail.component.scss']
})
export class ImportSourceFlagDetailComponent {
  @Input()
  public flagDefinition!: FlagDefinition | undefined;
  protected flagsToFetchHolder!: { sourceId: string, databaseId: FlagEnum }[];

  protected onIncludesFlag(include: boolean): void {
    this.flagDefinition = include ? { flagColumnPosition: 0, flagsToFetch: undefined } : undefined;
  }

  protected onFetchFlagsChange(fetch: boolean) {

    if (!this.flagDefinition) {
      return;
    }

    // Add new placeholder for visibility of the entry controls if stations are specified
    this.flagDefinition.flagsToFetch = fetch ? [] : undefined;

    this.flagsToFetchHolder = [{ sourceId: '', databaseId: FlagEnum.MISSING }];
  }

  protected onFlagsToFetchEntry(): void {

    if (!this.flagDefinition?.flagsToFetch) {
      return;
    }

    //If it's the last control add new placeholder for visibility of the entry controls
    const last = this.flagsToFetchHolder[this.flagsToFetchHolder.length - 1];
    if (last.sourceId !== '') {

      // Set the new valid values
      this.flagDefinition.flagsToFetch = [...this.flagsToFetchHolder];

      //Add new placholder values
      this.flagsToFetchHolder.push({ sourceId: '', databaseId: FlagEnum.MISSING });
    }
  }

  protected onFlagEntry(index: number, flagEnum: FlagEnum | null): void {
    if (!this.flagDefinition?.flagsToFetch) {
      return;
    }

    if (this.flagsToFetchHolder[index].sourceId && flagEnum !== null) {
      this.flagsToFetchHolder[index].databaseId = flagEnum;

      // Set the new valid values
      this.flagDefinition.flagsToFetch = [...this.flagsToFetchHolder];
    } else {
      this.flagsToFetchHolder.splice(index, 1);
    }
  }

}
