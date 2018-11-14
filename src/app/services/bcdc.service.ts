import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { from } from 'rxjs';
import { debounceTime, mergeMap, tap, catchError, filter, map, reduce } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BcdcService {

  loadingApis: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  loadingOrganizations: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  loadingContactRoles: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  loadingGroups: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);

  loadingApisError: String = null;

  allApis: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  allOrganizations: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  allGroups: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  licenses: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  topLevelOrganizations: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  securityClassifications: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  viewAudiences: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  contactRoles: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) { 

    this.fetchApis().subscribe(
      (resp) => {
        var apis = resp.result.results;
        this.allApis.next(apis)
        //this.loadingApisError = null;
      },
      (err) => {
        this.loadingApisError = "Unable to fetch a list of 'APIs'"
        this.loadingApis.next(false);
      },
      () => {this.loadingApis.next(false);}
      )

    this.fetchLicenses().subscribe(
      (licenses) => this.licenses.next(licenses),
      (err) => {console.error("Unable to fetch a list of 'licenses'"); console.log(err);}
      )

    this.fetchOrganizations().subscribe(
      (resp) => this.allOrganizations.next(resp.result),
      (err) => console.error("Unable to fetch a list of 'organizations'"),
      () => {this.loadingOrganizations.next(false);}
      )

    this.allOrganizations
      .pipe(
        filter(orgs => orgs != null)
      ).subscribe(
        this.buildTopLevelOrgs
      )    

    this.fetchSecurityClassifications().subscribe(
      (resp) => this.securityClassifications.next(resp.result.tags),
      (err) => console.error("Unable to fetch a list of 'security classifications'")
      )    

    this.fetchViewAudiences().subscribe(
      (resp) => this.viewAudiences.next(resp.result.tags),
      (err) => console.error("Unable to fetch a list of 'view audiences'")
      )  

    this.fetchContactRoles().subscribe(
      (resp) => this.contactRoles.next(resp.result.tags),
      (err) => console.error("Unable to fetch a list of 'contact roles'"),
      () => {this.loadingContactRoles.next(false);}
      )  

    this.fetchGroups().subscribe(
      (resp) => {
        var groups = resp.result;
        var filteredGroups = groups.filter(group => environment.group_blacklist.indexOf(group.name) == -1);
        this.allGroups.next(filteredGroups);
      },
      (err) => {
        console.error("Unable to fetch a list of 'groups'")
        this.loadingGroups.next(false);
      },
      () => {this.loadingGroups.next(false);}
      )      

  }

  private buildTopLevelOrgs = (allOrgs) => {
    from(allOrgs)
    .pipe(
      filter( org => org["child_of"].length == 0),
      reduce((acc, value) => {
        acc.push(value);
        return acc;
        }, [])
      ).subscribe(
        topLevelOrgs => {
          this.topLevelOrganizations.next(topLevelOrgs);
        })    
  }

  /**
   Returns a stream of sub organizations under the given parent organization (specified by the parent's title)
  */
  public fetchSubOrgs(orgToFind): Observable<any> {
    if (!this.allOrganizations || !orgToFind || !orgToFind.hasOwnProperty("title")) {
      return from([]); //an observable with an empty list
    }
    const stream = from(this.allOrganizations.value)
    .pipe(
      filter( org => {
        return org["child_of"].map(item => item.title).indexOf(orgToFind.title) >= 0;
      }),
      reduce((acc, value) => {
        acc.push(value);
        return acc;
        }, [])
      );
    return stream;
  }

  public fetchLicenses(): Observable<any> {
    var url = environment.license_list_url;    
    return this.http.get(url, {});
  }

  public fetchApis(): Observable<any> {
    this.loadingApis.next(true);
   
    //var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/package_search?fq=tags:API`;
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/package_search?fq=type:WebService&rows=1000&sort=title+desc`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);    
  }

  public fetchOrganizations(): Observable<any> { 
    
    this.loadingOrganizations.next(true);
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/organization_list_related?all_fields=true`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }

  public getOrganizationById(orgId): Observable<any> { 
    var observable = this.allOrganizations
      .pipe(
        map(orgs => orgs ? orgs.filter(org => org.id == orgId) : []), //convert to list of items with matching id
        map(orgs => orgs.length ? orgs[0] : null) //pick first item of those that remain
      )

    return observable;
  }

  public getLicenseByUrl(licenseUrl): Observable<any> { 
    var observable = this.licenses
      .pipe(
        map(licenses => licenses ? licenses.filter(license => license.url == licenseUrl) : []), //convert to list of items with matching url
        map(licenses => licenses.length ? licenses[0] : null) //pick first item of those that remain
      )

    return observable;
  }

  public fetchSecurityClassifications(): Observable<any> {
    this.loadingContactRoles.next(true);
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/vocabulary_show?id=security_class`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }

  public fetchViewAudiences(): Observable<any> {
    this.loadingContactRoles.next(true);
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/vocabulary_show?id=viewable`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }

  public fetchContactRoles(): Observable<any> { 
    
    this.loadingContactRoles.next(true);
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/vocabulary_show?id=contact_roles`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }  

  public fetchGroups(): Observable<any> {
    
    this.loadingGroups.next(true);
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/group_list?all_fields=true`;

    var options = {
      "headers": new HttpHeaders().set('accept', "application/json")
    }
    
    return this.http.get(url, options);
  }

  /**
   * param params: an object with keys specifying the fields to search and values specifying the
   * values to restrict to.  e.g.
   * params = { "name": "physical-address-geocoding-web-service"}
   * or 
   * params = { "type": "WebService"}
   */
  public getPackageSearchUrl(params){ 
    var queryString = "q=";
    for (var key in params) {
      queryString += `${key}:${params[key]}&`;
    }
    var url = `${environment.bcdc_base_url}${environment.bcdc_api_path}/package_search?${queryString}`;
    return url;
  }
}
