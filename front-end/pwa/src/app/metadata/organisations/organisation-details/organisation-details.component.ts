import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Subject, take } from 'rxjs';
import { OrganisationsCacheService } from '../services/organisations-cache.service';
import { ViewOrganisationModel } from '../models/view-organisation.model';
import { CreateUpdateOrganisationModel } from '../models/create-update-organisation.model';

@Component({
  selector: 'app-organisation-details',
  templateUrl: './organisation-details.component.html',
  styleUrls: ['./organisation-details.component.scss']
})
export class OrganisationDetailsComponent implements OnInit, OnDestroy {
  protected viewOrganisation!: ViewOrganisationModel;
  protected errorMessage: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private organisationsCacheService: OrganisationsCacheService,
    private route: ActivatedRoute,
    private location: Location,
  ) {

  }

  ngOnInit() {
    const userId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(userId)) {
      this.pagesDataService.setPageHeader('Edit Organisation');
      this.organisationsCacheService.findOne(+userId).pipe(take(1)).subscribe((data) => {
        if (data) this.viewOrganisation = data;
      });
    } else {
      this.pagesDataService.setPageHeader('New Organisation');
      this.viewOrganisation = { id: 0, name: '', description: '', extraMetadata: null, comment: null };
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    // TODO. do validations
    this.errorMessage = '';

    if (!this.viewOrganisation.name) {
      this.errorMessage = 'Input name';
      return;
    }

    const createUser: CreateUpdateOrganisationModel = {
      name: this.viewOrganisation.name,
      description: this.viewOrganisation.description? this.viewOrganisation.description: null, 
      extraMetadata: this.viewOrganisation.extraMetadata, 
      comment: this.viewOrganisation.comment ? this.viewOrganisation.comment : null,
    }

    if (this.viewOrganisation.id > 0) {
      this.organisationsCacheService.update(this.viewOrganisation.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Organisation Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });

    } else {
      this.organisationsCacheService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Organisation Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });
    }

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
