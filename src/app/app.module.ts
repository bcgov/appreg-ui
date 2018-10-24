import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule }    from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { RequestKeyomponent } from './request-key/request-key.component';

import { KqService } from './services/kq.service';
import { BcdcService } from './services/bcdc.service';
import { UrlService } from './services/url.service';

@NgModule({
  declarations: [
    AppComponent,
    RequestKeyomponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule    
  ],
  providers: [
    BcdcService,
    UrlService
    ],
  bootstrap: [AppComponent]
})
export class AppModule { }
