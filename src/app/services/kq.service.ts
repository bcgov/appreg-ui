import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KqService {

  constructor(private http: HttpClient) { 

  }

  /*
  data: a json object as specified in the OpenAPI spec for ARGG
  */
  requestKey(data: any): Observable<any> {
    var url = `${environment.kq_api_base_url}/request_key`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.post(url, data, options);
  }

}
