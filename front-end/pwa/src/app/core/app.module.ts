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

//--------------------------------------------

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SharedModule,
    MetadataModule,
    DataEntryModule,

    MatToolbarModule,
    MatSidenavModule,
    
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
