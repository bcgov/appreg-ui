import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs'; 

@Injectable({
  providedIn: 'root'
})
export class UrlService {

  /**
  It is actually quite difficult to find a regular expression that 
  can correctly identify valid URLs and reject invalid URLs.  Most have limitations in 
  which they reject certain valid URLs (such as IP addresses, "localhost", and others).  
  We really don't want to reject valid URLs, so the implementation here is more basic.  
  It only disallows a small set of invalid URLs, but at least it doesn't disallow valid 
  ones.
  Regex explanation:
    - url must start with http(s)://
    - next character must be a number or letter
    - any additional characters may follow
  */
  validUrlPattern = /^https?\:\/\/[\w]{1,}[^\s]*/;

  constructor(private http: HttpClient) { }

  fetch(url): Observable<any> {    

    if (!this.isValidUrl(url)) {
      return throwError("Invalid URL");
    }

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }

  /**
  Checks if the given url is "valid".  
  */
  isValidUrl(url) {
    
    //var query = /^https?\:\/\/[\w]{1,}[^\s]*/
    var regex = new RegExp(this.validUrlPattern);
    var result = regex.test(url);
    return result;
  }
}
