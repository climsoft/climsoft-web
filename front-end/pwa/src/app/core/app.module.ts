//------------modules------------------------------
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
//--------------------------------------------
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { DataEntryModule } from '../dataentry/dataentry.module';
//--------------------------------------------

//------------components------------------------------
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SharedModule,
    MetadataModule,
    DataEntryModule,    
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
