import { Component, OnDestroy, OnInit } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { NetworkStatusTypeEnum, PagesDataService, ToastEvent } from '../services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from '../../app-auth.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { MainMenuNameEnum, MenuItem, MenuItemsUtil, SubMenuNameEnum } from './menu-items';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  protected featuresNavItems: MenuItem[] = [];
  protected bOpenSideNav: boolean = false;
  protected pageHeaderName: string = '';
  protected toasts: ToastEvent[] = [];
  protected unsyncedObservations: string = '';
  protected displayUserDropDown: boolean = false;
  protected user!: LoggedInUserModel;
  protected appIsOffline: boolean = false;

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
        this.user = user;
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

    // Subscribe to the network status
    this.appPagesDataService.netWorkStatus.pipe(
      takeUntil(this.destroy$),
    ).subscribe(networkStatus => {
      this.appIsOffline = networkStatus === NetworkStatusTypeEnum.OFFLINE;
      // TODO. Remove all online required features
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
    this.featuresNavItems = [
      {
        name: MainMenuNameEnum.DASHBOARD,
        url: '/dashboard',
        icon: 'bi bi-sliders',
        open: false,
        children: []
      },
    ];

    if (user.isSystemAdmin) {
      this.featuresNavItems.push(MenuItemsUtil.DATA_INGESTION_MENU_ITEMS);
      this.featuresNavItems.push(MenuItemsUtil.DATA_MONITORING_MENU_ITEMS);
      this.featuresNavItems.push(MenuItemsUtil.QUALITY_CONTROL_MENU_ITEMS);
      this.featuresNavItems.push(MenuItemsUtil.DATA_EXTRACTION_MENU_ITEMS);
      this.featuresNavItems.push(MenuItemsUtil.METADATA_MENU_ITEMS);
      this.featuresNavItems.push(MenuItemsUtil.SYSTEM_ADMIN_MENU_ITEMS);
      return;
    } else if (!user.permissions) {
      return;
    }

    //-------------------------------------------
    const dataIngestionMenuItems: MenuItem = MenuItemsUtil.DATA_INGESTION_MENU_ITEMS;
    // Remove system admin data ingestion sub-modules
    dataIngestionMenuItems.children = dataIngestionMenuItems.children.filter(item =>
      item.name !== SubMenuNameEnum.SCHEDULED_IMPORT &&
      item.name !== SubMenuNameEnum.DELETED_DATA
    );

    // If no data entry permissions then remove data entry sub-modules
    if (!user.permissions.entryPermissions) {
      dataIngestionMenuItems.children = dataIngestionMenuItems.children.filter(item =>
        item.name !== SubMenuNameEnum.DATA_ENTRY
        && item.name !== SubMenuNameEnum.DATA_CORRECTION
        && item.name !== SubMenuNameEnum.MANUAL_IMPORT
      );
    } else {
      // If no import permissions then remove manual import sub-modules
      if (!user.permissions.entryPermissions.importPermissions) {
        dataIngestionMenuItems.children = dataIngestionMenuItems.children.filter(item =>
          item.name !== SubMenuNameEnum.MANUAL_IMPORT
        );
      }
    }

    // If no any data input permissions then just remove it
    if (dataIngestionMenuItems.children.length > 0) this.featuresNavItems.push(dataIngestionMenuItems);
    //-------------------------------------------

    //-------------------------------------------
    // Add monitoring modules if user has monitoring permissions.
    if (user.permissions.ingestionMonitoringPermissions) {
      this.featuresNavItems.push(MenuItemsUtil.DATA_MONITORING_MENU_ITEMS);
    }
    //-------------------------------------------

    //-------------------------------------------
    // If no qc permissions then remove qc sub-module
    if (user.permissions.qcPermissions) {
      this.featuresNavItems.push(MenuItemsUtil.QUALITY_CONTROL_MENU_ITEMS);
    }
    //-------------------------------------------

    //-------------------------------------------
    // If there is export permissions then remove scheduled exports because it's for admin only.
    if (user.permissions.exportPermissions) {
      const dataExtractionMenuItems: MenuItem = MenuItemsUtil.DATA_EXTRACTION_MENU_ITEMS;
      dataExtractionMenuItems.children = dataExtractionMenuItems.children.filter(item => item.name !== SubMenuNameEnum.SCHEDULED_EXPORT);
      this.featuresNavItems.push(dataExtractionMenuItems);
    }
    //-------------------------------------------

    //-------------------------------------------
    // Remove admin related metadata
    const metadataMenuItems: MenuItem = MenuItemsUtil.METADATA_MENU_ITEMS;
    metadataMenuItems.children = metadataMenuItems.children.filter(item =>
      item.name !== SubMenuNameEnum.SOURCE_TEMPLATES
      && item.name !== SubMenuNameEnum.EXPORT_TEMPLATES
      && item.name !== SubMenuNameEnum.INTEGRATION_CONNECTORS
      && item.name !== SubMenuNameEnum.ORGANISATIONS
      && item.name !== SubMenuNameEnum.NETWORK_AFFILIATIONS
      && item.name !== SubMenuNameEnum.REGIONS
    );

    this.featuresNavItems.push(metadataMenuItems);
    //-------------------------------------------
  }

}
