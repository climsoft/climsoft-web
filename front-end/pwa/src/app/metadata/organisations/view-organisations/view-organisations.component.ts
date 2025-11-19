import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { ViewOrganisationModel } from '../models/view-organisation.model';
import { OrganisationsCacheService } from '../services/organisations-cache.service';
import { ActivatedRoute, Router } from '@angular/router';

type optionsType = 'Add' | 'Delete All';

@Component({
  selector: 'app-view-organisations',
  templateUrl: './view-organisations.component.html',
  styleUrls: ['./view-organisations.component.scss']
})
export class ViewOrganisationsComponent implements OnDestroy {
  protected organisations!: ViewOrganisationModel[];
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private organisationsCacheService: OrganisationsCacheService,
    private router: Router,
    private route: ActivatedRoute,
  ) {

    this.pagesDataService.setPageHeader('Organisations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });

    // Get all sources 
    this.organisationsCacheService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.organisations = data;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onOptionsClicked(option: optionsType): void {
    if (option === 'Add') {
      this.router.navigate(['organisation-details', 'new'], { relativeTo: this.route.parent });
    } else if (option === 'Delete All') {
      this.organisationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
        if (data) {
          this.pagesDataService.showToast({ title: "Organisations Deleted", message: `All organisations deleted`, type: ToastEventTypeEnum.SUCCESS });
        }
      });
    }
  }

  protected onEditOrganisation(organisation: ViewOrganisationModel): void {
    if (!this.isSystemAdmin) return;
    this.router.navigate(['organisation-details', organisation.id], { relativeTo: this.route.parent });
  }





}
