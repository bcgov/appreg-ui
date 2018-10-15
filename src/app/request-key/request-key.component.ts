import { environment } from '../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { ArggService } from '../services/argg.service';
import { BcdcService } from '../services/bcdc.service';
import { UrlService } from '../services/url.service';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { debounceTime, mergeMap, tap, catchError, filter, reduce, map } from 'rxjs/operators';
import { of, from, combineLatest } from 'rxjs';

@Component({
  selector: 'request-key',
  templateUrl: './request-key.component.html',
  styleUrls: ['./request-key.component.css']
})
export class RequestKeyomponent implements OnInit {

  DEFAULT_ERROR_MSG: String = "Unable to register the API.";

  form1: FormGroup;
  loadingMetadataRecord: boolean;
  allApis: any[];
  metadataRecord: any;
  metadataRecordErr: string;
  autocompleteFromMetadataRecord: boolean;
  submitSuccess: boolean;
  submitLoading: boolean;
  submitError: any;
  topLevelOrganizations: any[];
  ownerSubOrganizations: any[];
  groups: any[];
  submitterSubOrganizations: any[];
  contactRoles: any[];
  securityClassifications: any[];
  viewAudiences: any[];
  env = environment;


  constructor(private fb: FormBuilder,
    private arggService: ArggService,
    public bcdcService: BcdcService,
    private urlService: UrlService) { 

    this.form1 = this.fb.group({
      //API key type (developer key or production key)
      apiKeyType: [null, Validators.required],
      //API
      api: [null, Validators.required],
      //metadata
      hasMetadataRecord: [null, Validators.required],
      metadataRecordUrl: [null],
      //Application
      appTitle: [null, Validators.required],
      appDescription: [null, Validators.required],
      appType: [null, Validators.required],
      appUrl: [null, Validators.compose([Validators.required, Validators.pattern(urlService.validUrlPattern)])],
      //owner
      ownerOrg: [null, Validators.required],
      ownerSubOrg: [null, Validators.required],
      principalContactName: [null, Validators.required],
      principalContactEmail: [null, Validators.required],
      principalContactPhone: [null, Validators.required],
      isPrincipalContact: [null, Validators.required],
      //submitter
      submitterContactName: [null],
      submitterContactEmail: [null],
      submitterContactPhone: [null],
      submitterRole: [null],
      submitterOrg: [null],
      submitterSubOrg: [null]
    });

  bcdcService.allApis
    .subscribe(
      apis => {
        this.allApis = apis;
      })

    bcdcService.topLevelOrganizations
    .subscribe(
      orgs => {
        this.topLevelOrganizations = orgs;
      })

    bcdcService.contactRoles.subscribe(
      (contactRoles) => this.contactRoles = contactRoles
      )

    bcdcService.securityClassifications.subscribe(
      (securityClassifications) => this.securityClassifications = securityClassifications
      )

    bcdcService.viewAudiences.subscribe(
      (viewAudiences) => this.viewAudiences = viewAudiences
      )

    bcdcService.allGroups
      .subscribe(
        allGroups => {
          this.groups = allGroups;
        })


    //conditions for autopopulating form data from OpenAPI spec
    this.form1.get("metadataRecordUrl").valueChanges
      .pipe(
        filter(val => val),     
        map(val => this.getMetadataRecordJsonUrl(val)),
        debounceTime(300),        
        tap(val => this.metadataRecordErr = null),
        tap(val => this.setMetadataSearchResponse(null)), 
        filter(val => val),
        tap(val => this.loadingMetadataRecord = true),       
        mergeMap(url => this.urlService.fetch(url).pipe(catchError(
          (err) => { this.handleMetadataFetchError(err); return of(null); } 
        ))),
        tap(val => this.loadingMetadataRecord = false)
        )      
      .subscribe(
        this.setMetadataSearchResponse,
        (err) => {
          console.log(err);
          this.handleMetadataFetchError("Unknown error");
          this.loadingMetadataRecord = false;
        }
        ) 

    //step complete?  enable next step
    //-------------------------------------------------------------------
    this.form1.get("apiKeyType").valueChanges
      .subscribe((apiKeyType) => {
        const enableApiGroup = apiKeyType == "production-key"; 
        this.toggleApiGroup(enableApiGroup);
      });

    //conditions for updating/displaying the list of owner sub-organizations 
    //when an organization is chosen
    this.form1.get("ownerOrg").valueChanges
      .subscribe(this.enableOwnerSubOrgs);

    this.form1.get("isPrincipalContact").valueChanges
      .subscribe(isPrincipalContact => {
        this.toggleSubmitterFields(this.yesNoToBool(isPrincipalContact))
      });

    //conditions for updating/displaying the list of submitter sub-organizations 
    //when an organization is chosen
    this.form1.get("submitterOrg").valueChanges
      .subscribe(this.enableSubmitterSubOrgs);

    this.form1.get("hasMetadataRecord").valueChanges
      .subscribe(hasMetadataRecord => {
        var hasMetadata = this.yesNoToBool(hasMetadataRecord);
        this.toggleMetadataUrl(hasMetadata);
        this.togglePrimaryFormFieldsEnabled(hasMetadata !== null);
      });

  }

  ngOnInit() {
    this.togglePrimaryFormFieldsEnabled(false);
  }

  /*
  if the url is for the metadata record's HTML web page, then convert into the url for the
  JSON version.
  */
  getMetadataRecordJsonUrl = (url) => {
    const datasetStr = "/dataset/";
    var datasetIndex = url.indexOf(datasetStr);
    if (datasetIndex > -1) {
      var identifier = url.substring(datasetIndex+datasetStr.length);
      var isId = false;
      var searchParams = null;
      if (isId) {
        searchParams = {"id": identifier};
      }
      else {
        searchParams = {"name": identifier};
      }
      return this.bcdcService.getPackageSearchUrl(searchParams);  
    }
    //cannot find a suitable URL for JSON format, so just return the original value
    return url;
  }

  handleMetadataFetchError = (err) => {
    if (err.hasOwnProperty("status")) {
      if (err.status == 404) {
        this.metadataRecordErr = "No metadata record was found at the above URL.";
        return;
      }
      else if (err.status == 200) {
        if (err.hasOwnProperty("message")) {
          this.metadataRecordErr = "Unable to parse metadata record.";
          return;
        }
      }
    }
    
    this.metadataRecordErr = "An error occurred when accessing the metadata record";

  }

  setMetadataSearchResponse = (metadataSearchResponse: any) => {

    var metadataRecord = null;
    
    if (metadataSearchResponse) {
      if (metadataSearchResponse.hasOwnProperty("result") && metadataSearchResponse.result) {  
        var result = metadataSearchResponse.result;
        if (result.hasOwnProperty("results") && result.results && result.results.length) {
          metadataRecord = result.results[0];
          if (result.results.length > 1) {
            console.warn("Metadata search found multiple metadata records.  The first one will be used.");
          }
        }
        else {
          console.warn("Unable to lookup metadata record.  Form fields will not be auto-populated.");
        }
      }
    }

    this.setMetadataRecord(metadataRecord);

  }

  setMetadataRecord = (metadataRecord: any) => {
    this.metadataRecord = metadataRecord;

    if (!this.metadataRecord) {
      return;
    }

    try {
      this.populateFormFromMetadataRecord(this.metadataRecord);
      this.metadataRecordErr = null;
    }
    catch (e) {
      this.metadataRecordErr = e;
    }  
  }

  enableOwnerSubOrgs = (org) => {
    this.bcdcService.fetchSubOrgs(org).subscribe(
      subOrgs => {
        this.ownerSubOrganizations = subOrgs;
        if (subOrgs && subOrgs.length) {
          this.form1.get("ownerSubOrg").setValidators(Validators.required)
        }
        else {
         this.form1.get("ownerSubOrg").setValidators(null); 
        }
        this.form1.get("ownerSubOrg").updateValueAndValidity();
      })        
  }

  enableSubmitterSubOrgs = (org) => {
    this.bcdcService.fetchSubOrgs(org).subscribe(
      subOrgs => {
        this.submitterSubOrganizations = subOrgs;
        if (subOrgs && subOrgs.length) {
          this.form1.get("submitterSubOrg").setValidators(Validators.required)
        }
        else {
         this.form1.get("submitterSubOrg").setValidators(null); 
        }
        this.form1.get("submitterSubOrg").updateValueAndValidity();
      })        
  }

  toggleSubmitterFields = (isPrincipalContact) => {
    const v = isPrincipalContact ? null : [Validators.required];

    this.form1.get("submitterContactName").setValidators(v);
    this.form1.get("submitterContactName").updateValueAndValidity();

    this.form1.get("submitterContactEmail").setValidators(v);
    this.form1.get("submitterContactEmail").updateValueAndValidity();

    this.form1.get("submitterContactPhone").setValidators(v);
    this.form1.get("submitterContactPhone").updateValueAndValidity();

    this.form1.get("submitterRole").setValidators(v);
    this.form1.get("submitterRole").updateValueAndValidity();

    this.form1.get("submitterOrg").setValidators(v);
    this.form1.get("submitterOrg").updateValueAndValidity();

  }

  toggleMetadataUrl = (hasMetadataRecord) => {
    const v = hasMetadataRecord ? [Validators.required] : null;

    this.form1.get("metadataRecordUrl").setValidators(v);
    this.form1.get("metadataRecordUrl").updateValueAndValidity();
  }  

  toggleApiGroup = (enabled) => {
    var apiFields = [this.form1.get("api")];
    this._toggleEnabled(apiFields, enabled);
  }

  togglePrimaryFormFieldsEnabled = (isEnabled) => {
    var fields = [
      //about this application
      this.form1.get("appTitle"), 
      this.form1.get("appDescription"), 
      this.form1.get("appUrl"),
      //owner
      this.form1.get("ownerOrg"),
      this.form1.get("ownerSubOrg"),
      //principal contact
      this.form1.get("principalContactName"),
      this.form1.get("principalContactEmail"),
      this.form1.get("principalContactPhone"),
      ];
    this._toggleEnabled(fields, isEnabled);
  }

  _toggleEnabled = (fields, enabled) => {
    if (enabled) {
      fields.forEach(field => {field.enable()});
    }
    else {
      fields.forEach(field => {field.disable()});
    }    
  }

  /*
  Auto-populates some form fields from the metadata record
  */
  private populateFormFromMetadataRecord(metadataRecord: any) {
    var autocompletedAtLeastOneField= false;

    //app details
    //------------

    //app title
    if (metadataRecord.hasOwnProperty("title")) {
      if (!this.form1.get("appTitle").touched) {
        this.form1.get("appTitle").setValue(metadataRecord.title)
        autocompletedAtLeastOneField = true;  
      }
    }
    
    //app description
    if (metadataRecord.hasOwnProperty("description")) {
      if (!this.form1.get("appDescription").touched) {
        this.form1.get("appDescription").setValue(metadataRecord.description)
        autocompletedAtLeastOneField = true;
      }
    }
    else if (metadataRecord.hasOwnProperty("notes")) {
      if (!this.form1.get("appDescription").touched) {
        this.form1.get("appDescription").setValue(metadataRecord.notes)
        autocompletedAtLeastOneField = true;
      }
    }

    //app url
    if (metadataRecord.hasOwnProperty("url")) {
      if (!this.form1.get("appUrl").touched) {
        this.form1.get("appUrl").setValue(metadataRecord.url)
        autocompletedAtLeastOneField = true;  
      }
    }

    //owner
    //------------

    //owner org
    if (metadataRecord.hasOwnProperty("org")) {
      var orgId = metadataRecord.org;
      if (!this.form1.get("ownerOrg").touched) {
        //async request.  set org when response comes in.
        this.bcdcService.getOrganizationById(orgId).subscribe(
          org => {
            if (org) {
              this.form1.get("ownerOrg").setValue(org);
              autocompletedAtLeastOneField = true;  
            }
        })
      }      
    }

    //owner sub-org
    if (metadataRecord.hasOwnProperty("sub_org")) {
      var orgId = metadataRecord.sub_org;
      if (!this.form1.get("ownerSubOrg").touched) {
        //async request.  set org when response comes in.
        this.bcdcService.getOrganizationById(orgId).subscribe(
          org => {
            if (org) {
              this.form1.get("ownerSubOrg").setValue(org);
              autocompletedAtLeastOneField = true;  
            }
        })
      }      
    }

    //owner principal contact
    //------------------------

    if (metadataRecord.hasOwnProperty("contacts")) {
      var primaryContact = this.choosePrimaryContact(metadataRecord);
      if (primaryContact) {
        if (!this.form1.get("principalContactName").touched && primaryContact.hasOwnProperty("name")) {
          this.form1.get("principalContactName").setValue(primaryContact.name)
          autocompletedAtLeastOneField = true;  
        }  
        if (!this.form1.get("principalContactEmail").touched && primaryContact.hasOwnProperty("email")) {
          this.form1.get("principalContactEmail").setValue(primaryContact.email)
          autocompletedAtLeastOneField = true;  
        }
        if (!this.form1.get("principalContactEmail").touched && primaryContact.hasOwnProperty("email")) {
          this.form1.get("principalContactEmail").setValue(primaryContact.email)
          autocompletedAtLeastOneField = true;  
        }         
      }
    }
    this.autocompleteFromMetadataRecord = autocompletedAtLeastOneField;
  }

  /**
   given a metadata record, find a contact that should be considered the 
   "primary" contact.  returns the contact object, or returns null if no 
   suitable contact can be found.
   */
  choosePrimaryContact(metadataRecord: any) {
    //contacts with role:custodian are considered first as the primary contact.
    //contacts with role:pointOfContact are considered second
    //
    var rolePriorities = ["custodian", "pointOfContact"]; 
    var primaryContact = null;
    if (metadataRecord.hasOwnProperty("contacts")) {
      var contacts = metadataRecord.contacts;
      if (contacts && contacts.length) {        
        contacts.forEach(contact => {
          if (!primaryContact) {
            primaryContact = contact;
          }
          else if (contact.hasOwnProperty("role") && primaryContact.hasOwnProperty("role")) {
            var contactRank = rolePriorities.indexOf(contact.role);
            var primaryContactRank = rolePriorities.indexOf(primaryContact.role)
            if (primaryContactRank >= 0 && primaryContactRank < contactRank || contactRank < 0) {
              primaryContact = contact;  
            }            
          } 
        }); //foreach
      }
    }
    return primaryContact;
  }

  submit(): void {
    
    //prepare values that will be injected into the data object but 
    //which need non-trivial computation
    var openApiSpecUrl = this.form1.get("openApiSpecUrl").value;
    var existingMetadataUrl = this.form1.get('metadataRecordUrl').value;
    var supportsHttps = this.yesNoToBool(this.form1.get("supportsHttps").value);
    var supportsCors = this.yesNoToBool(this.form1.get("supportsCors").value);
    var useGateway = this.yesNoToBool(this.form1.get("useGateway").value);
    var useThrottling = this.yesNoToBool(this.form1.get("useGatewayThrottling").value);
    var useApiKeys = this.yesNoToBool(this.form1.get("useGatewayApiKeys").value);
    var principalContact = {
      "name": this.form1.get("principalContactName").value,
      "org_id": this.form1.get("ownerOrg").value.id,
      "sub_org_id": this.form1.get("ownerSubOrg").value.id,
      "business_email": this.form1.get("principalContactEmail").value,
      "business_phone": this.form1.get("principalContactPhone").value,
      "role": "pointOfContact", 
      "private": "Display"      
    }
    var submitterContact = this.form1.get("isPrincipalContact").value == "yes" ?
      principalContact :
      {
        "name": this.form1.get("submitterContactName").value,
        "org_id": this.form1.get("submitterOrg").value.id,
        "sub_org_id": this.form1.get("submitterSubOrg").value.id,
        "business_email": this.form1.get("submitterContactEmail").value,
        "business_phone": this.form1.get("submitterContactPhone").value,
        "role": this.form1.get("submitterRole").value   
      }
    var downloadAudience = this.form1.get("viewAudience").value;

    var data = {
      "submitted_by_person": submitterContact,
      "existing_metadata_url": existingMetadataUrl,
      "metadata_details": {
        "title": this.form1.get('title').value,
        "owner": {
          "org_id": this.form1.get("ownerOrg").value.id,
          "sub_org_id": this.form1.get("ownerSubOrg").value.id,
          "contact_person": principalContact
        },    
        "description": this.form1.get('description').value,
        "status": "completed", //default value
        "security": {
          "view_audience": this.form1.get("viewAudience").value, 
          "download_audience": downloadAudience, 
          "metadata_visibility": "Public", //default value
          "security_class": this.form1.get("securityClass").value 
        },
        "license": {
          "license_title": this.form1.get("license").value.title,
          "license_url": this.form1.get("license").value.url,
          "license_id": this.form1.get("license").value.id
        }
      },
      "existing_api": {
        "supports": {
          "https": supportsHttps,
          "cors": supportsCors
        },
        "base_url": this.form1.get("baseUrl").value,
        "openapi_spec_url": openApiSpecUrl
      },
      "gateway": {
        "use_gateway": useGateway,
        "use_throttling": useThrottling,
        "restrict_access": useApiKeys,
        "api_shortname": this.form1.get("applicationShortName").value    
      }
    }

    this.submitLoading = true;
    this.arggService.registerApi(data).subscribe(
      this.onSubmitSuccess,
      this.onSubmitError,
      this.onSubmitComplete,
      )
  }

  yesNoToBool(val: string, default_val?: any) {
    if (val == "yes")
      return true;
    if (val == "no") {
      return false;
    }
    return default_val;
  }

  onSubmitSuccess = (resp) => {
    console.log("success");
    this.submitSuccess = true;
    this.submitError = null;
  }

  onSubmitError = (resp) => {
    var errorMsg = this.DEFAULT_ERROR_MSG;
    if (resp.hasOwnProperty("error") && resp.error.hasOwnProperty("msg")) {
      errorMsg = resp.error.msg;
    }

    this.submitLoading = false;
    this.submitError = errorMsg;
  }

  onSubmitComplete = () => {
    this.submitLoading = false;
  }

}
