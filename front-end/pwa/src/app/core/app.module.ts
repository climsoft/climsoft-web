//------------modules------------------------------
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

//--------------------------------------------
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { DataEntryModule } from '../dataentry/data-entry.module';
//--------------------------------------------

//------------components------------------------------
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component'; 
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AccountVerificationComponent } from './account-verification/account-verification.component';
import { NotFoundComponent } from './not-found/not-found.component';


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
