//------------modules------------------------------
import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

//--------------------------------------------
import { SharedModule } from './shared/shared.module';
import { MetadataModule } from './metadata/metadata.module';
//--------------------------------------------

//------------components------------------------------ 
import { HomeComponent } from './core/home/home.component';
import { DashboardComponent } from './core/dashboard/dashboard.component';
import { LoginComponent } from './core/login/login.component';
import { PasswordResetComponent } from './core/password-reset/password-reset.component';
import { AccountVerificationComponent } from './core/account-verification/account-verification.component';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { AdminModule } from './admin/admin.module';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppAuthInterceptor } from './app-auth.interceptor';
import { DataExtractionModule } from './data-extraction/data-extraction.module';
import { DataIngestionModule } from './data-ingestion/data-ingestion.module';
import { DataMonitoringModule } from './data-monitoring/data-monitoring.module';
import { ObservationsModule } from './observations/observations.module';
import { QualityControlModule } from './quality-control/quality-control.module';
import { ServiceWorkerModule } from '@angular/service-worker';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardComponent,
    LoginComponent,
    PasswordResetComponent,
    AccountVerificationComponent,
    NotFoundComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SharedModule,
    MetadataModule,
    AdminModule,
    ObservationsModule,
    DataIngestionModule,
    DataMonitoringModule,
    QualityControlModule,
    DataExtractionModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      // registrationStrategy: 'registerWhenStable:30000'

      // TODO. Troubleshoot to check if it solves the CloudFlare tunnel problem
      registrationStrategy: 'registerImmediately',
    }),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AppAuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
