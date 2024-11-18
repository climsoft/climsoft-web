//------------modules------------------------------
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; 
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

//--------------------------------------------
import { SharedModule } from './shared/shared.module';
import { MetadataModule } from './metadata/metadata.module';
import { DataEntryModule } from './data-entry/data-entry.module';
//--------------------------------------------

//------------components------------------------------ 
import { HomeComponent } from './core/home/home.component';
import { DashboardComponent } from './core/dashboard/dashboard.component';
import { LoginComponent } from './core/login/login.component'; 
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { PasswordResetComponent } from './core/password-reset/password-reset.component';
import { AccountVerificationComponent } from './core/account-verification/account-verification.component';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { SettingsModule } from './settings/settings.module';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';


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
    //HttpClientModule,
    SharedModule,
    MetadataModule,
    DataEntryModule,
    SettingsModule    
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
