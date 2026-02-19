import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, takeUntil } from 'rxjs';
import { OrganisationsCacheService } from '../services/organisations-cache.service';
import { ViewOrganisationModel } from '../models/view-organisation.model';
import { CreateUpdateOrganisationModel } from '../models/create-update-organisation.model';

@Component({
  selector: 'app-organisation-input-dialog',
  templateUrl: './organisation-input-dialog.component.html',
  styleUrls: ['./organisation-input-dialog.component.scss']
})
export class OrganisationInputDialogComponent implements OnDestroy {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewOrganisation!: ViewOrganisationModel;
  protected errorMessage!: string;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private organisationsCacheService: OrganisationsCacheService,
  ) {
  }

  public openDialog(organisationId?: number): void {
    this.errorMessage = '';
    this.open = true;

    if (organisationId) {
      this.title = 'Edit Organisation';
      this.organisationsCacheService.findOne(organisationId).pipe(
        takeUntil(this.destroy$)
      ).subscribe((data) => {
        if (data) this.viewOrganisation = data;
      });
    } else {
      this.title = 'New Organisation';
      this.viewOrganisation = { id: 0, name: '', description: '', extraMetadata: null, comment: null };
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    this.errorMessage = '';

    if (!this.viewOrganisation.name) {
      this.errorMessage = 'Input name';
      return;
    }

    const createUser: CreateUpdateOrganisationModel = {
      name: this.viewOrganisation.name,
      description: this.viewOrganisation.description ? this.viewOrganisation.description : null,
      extraMetadata: this.viewOrganisation.extraMetadata,
      comment: this.viewOrganisation.comment ? this.viewOrganisation.comment : null,
    }

    if (this.viewOrganisation.id > 0) {
      this.organisationsCacheService.update(this.viewOrganisation.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Organisation Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.ok.emit();
        }
      });

    } else {
      this.organisationsCacheService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Organisation Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.ok.emit();
        }
      });
    }
  }

}
