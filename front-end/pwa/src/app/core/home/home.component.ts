import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { PagesDataService, ToastEvent } from '../services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from '../../app-auth.service';
import { DATA_EXTRACTION_MENU_ITEMS, DATA_INGESTION_MENU_ITEMS, FEATURES_MENU_ITEMS, MainMenuNameEnum, MenuItem, METADATA_MENU_ITEMS, SubMenuNameEnum, SYSTEM_ADMIN_MENU_ITEMS } from './menu-items';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  protected featuresNavItems: MenuItem[] = FEATURES_MENU_ITEMS;
  protected bOpenSideNav: boolean = false;
  protected pageHeaderName: string = '';
  protected toasts: ToastEvent[] = [];
  protected unsyncedObservations: string = '';
  protected displayUserDropDown: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private appViewPortService: ViewportService,
    private appAuthService: AppAuthService,
    private appPagesDataService: PagesDataService,
    private observationsService: ObservationsService,) {
  }

  ngOnInit(): void {
    // Subscribe to the user changes
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (user) {
        this.setAllowedNavigationLinks(user);
      }
    });

    // Subscribe to the app view port size changes
    this.appViewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.bOpenSideNav = viewPortSize === ViewPortSize.LARGE;
    });

    // Subscribe to the oage header changes
    this.appPagesDataService.pageHeader.pipe(
      takeUntil(this.destroy$),
    ).subscribe(name => {
      // To prevent `ExpressionChangedAfterItHasBeenCheckedError` raised in development mode 
      // where a child component changes a parent component’s data during a lifecycle hook like `ngOnInit` or ``ngAfterViewInit`
      // Wrap the changes in time out function
      setTimeout(() => {
        this.pageHeaderName = name;
      }, 0);


    });

    // Subscribe to the toast events
    this.appPagesDataService.toastEvents.pipe(
      takeUntil(this.destroy$),
    ).subscribe(toast => {
      this.showToast(toast);
    });

    // Subscribe to sync operations
    this.observationsService.unsyncedObservations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(unsynced => {
      if (unsynced === 0) {
        this.unsyncedObservations = '';
      } else if (unsynced > 9000) {
        this.unsyncedObservations = `${unsynced}+`;
      } else {
        this.unsyncedObservations = `${unsynced}`;
      }
    });

    // Sync observations if there is internet
    this.observationsService.syncObservations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected logOut(): void {
    this.appAuthService.logout().pipe(take(1)).subscribe(data => {
      this.appAuthService.removeUser();
      //TODO. test why this doesn't work here but works in app component. Has something to do with the route .
      //should go to app component route
      //this.router.navigate(['../../login']);
    });
  }

  private showToast(currentToast: ToastEvent) {
    this.toasts.push(currentToast);
    // automatically hide the toast after 3 seconds
    setTimeout(() => {
      if (this.toasts.length > 0) {
        //remove the first
        this.toasts.splice(0, 1);
      }
    }, 3000);
  }

  protected syncObservations() {
    this.observationsService.syncObservations();
  }

  private setAllowedNavigationLinks(user: LoggedInUserModel): void {

    this.featuresNavItems = [];

    if (user.isSystemAdmin) {
      this.featuresNavItems = [
        {
          name: MainMenuNameEnum.DASHBOARD,
          url: '/dashboard',
          icon: 'bi bi-sliders',
          open: false,
          children: []
        },
        DATA_INGESTION_MENU_ITEMS,
        DATA_EXTRACTION_MENU_ITEMS,
        METADATA_MENU_ITEMS,
        SYSTEM_ADMIN_MENU_ITEMS,
      ];

      return;
    }

    if (!user.permissions) {
      return;
    }

    //-------------------------------------------
    const dataIngestionMenuItems: MenuItem = DATA_INGESTION_MENU_ITEMS;
    dataIngestionMenuItems.children = dataIngestionMenuItems.children.filter(item =>
      item.name === SubMenuNameEnum.MANUAL_IMPORT ||
      item.name === SubMenuNameEnum.SCHEDULED_IMPORT ||
      item.name === SubMenuNameEnum.DELETED_DATA
    );
    // If no data entry permissions then remove data entry sub-modules
    if (!user.permissions.entryPermissions) {
      dataIngestionMenuItems.children = dataIngestionMenuItems.children.filter(item =>
        item.name === SubMenuNameEnum.DATA_ENTRY ||
        item.name === SubMenuNameEnum.DATA_CORRECTION
      );
    }
    this.featuresNavItems.push(dataIngestionMenuItems);
    //-------------------------------------------

    //-------------------------------------------
    // If no data entry permissions then remove data entry sub-modules
    if (user.permissions.exportPermissions) {
      const dataExtractionMenuItems: MenuItem = DATA_EXTRACTION_MENU_ITEMS;
      dataExtractionMenuItems.children = dataExtractionMenuItems.children.filter(item => item.name === SubMenuNameEnum.SCHEDULED_EXPORT);
      this.featuresNavItems.push(dataIngestionMenuItems);
    }
    //-------------------------------------------

    //-------------------------------------------
    const metadataMenuItems: MenuItem = METADATA_MENU_ITEMS;
    metadataMenuItems.children = metadataMenuItems.children.filter(item =>
      item.name === SubMenuNameEnum.SOURCE_TEMPLATES ||
      item.name === SubMenuNameEnum.EXPORT_TEMPLATES ||
      item.name === SubMenuNameEnum.INTEGRATION_CONNECTORS
    );

    this.featuresNavItems.push(metadataMenuItems);
    //-------------------------------------------

  }


}
