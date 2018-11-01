function doGet (e) {


  cGoa.GoaApp.userClone( 
    'blogger', 
    PropertiesService.getScriptProperties() , 
    PropertiesService.getUserProperties() 
  );

  
  var goa =  cGoa.GoaApp.createGoa(
      'blogger', 
      PropertiesService.getUserProperties()
    ).execute(e);
  

  if (goa.needsConsent()) {
    return goa.getConsent();
  }
  
  // if we get here its time for your webapp to run 
  // and we should have a token, or thrown an error somewhere
  if (!goa.hasToken()) { 
    throw 'something went wrong with goa - did you check if consent was needed?';
  }

    // now return the evaluated page
  return HtmlService.createHtmlOutput('you can close this now')
  .setSandboxMode(HtmlService.SandboxMode.IFRAME);

}
function testBlogger() {

  // get the api
  var bapi = new BloggerApi();
  
  // get an access token - this has all been taken care of by a doGet() previously
  var goa =  cGoa.GoaApp.createGoa(
      'blogger', 
      PropertiesService.getUserProperties()
    ).execute();

  // set the accesstoken
  bapi.setAccessToken(goa.getToken());
  
  // get my blogs and find the one i want
  var result = bapi.getBlogs();
  if (!result.success){
    throw result.err;
  }
  var blog = result.data.items.filter(function (d) {
    return d.name = "Desktop Liberation"; 
  });
  
  if (blog.length !== 1) {
    throw 'failed to find blog';
  }
  
  // so now i have the id .. get the pageviews
  var result = bapi.getPageViews (blog[0].id);
  Logger.log(result);
  
  // get all the posts
  
}

function oneOffSetting() { 

  // used by all using this script
  var propertyStore = PropertiesService.getScriptProperties();

  
   cGoa.GoaApp.setPackage (propertyStore , 
    cGoa.GoaApp.createPackageFromFile (DriveApp , {
      packageName: 'blogger',
      fileId:'0B92ExLh4POiZT0hRWkxEbTV1emc',
      scopes : cGoa.GoaApp.scopesGoogleExpand (['blogger']),
      service:'google'
    }));

}
/**
 * api wrapper for blogger
 * @constructor BloggerAPI
 */
var BloggerApi = function () {

  var self = this, accessToken_;

    
  /**
  * return the base API Url
  * @return {string} the base api url
  */
  function getBaseUrl_ () {
    return "https://www.googleapis.com/blogger/v3/";
  }
  
  /**
  * set up the access token
  * you can use script app.gettoken for this
  * @param {string} accessToken the token to use
  * @return {SheetsMore} self
  */
  self.setAccessToken = function (accessToken) {
    accessToken_ = accessToken;
    return self;
  };
  
  /**
   * get blogs for user
   * @param {string} [userIf=self] the user
   * @return {object} the blogs of this user
   */
  self.getBlogs = function (user) {
  
    user = user || 'self';
    return urlExecute_ ( 'users/' + user + '/blogs');
    
  };
  
    /**
   * get pageviews for blog
   * @param {string} id the id
   * @return {object} the pagevoews of this id
   */
  self.getPageViews = function (id) {
  //GET https://www.googleapis.com/blogger/v3/blogs/7289528839575681860/pageviews?range=30DAYS&range=7DAYS&range=all&key={YOUR_API_KEY}
    return urlExecute_ ( 'blogs/' + id + '/pageviews', ["range=30DAYS","range=7DAYS","range=all"] );
    
  };

    /**
  * execute a API request
  * @param {string} urlTail the url appendage
  * @param {[string]} [params] the params
  * @param {string} [options] any options to be merged in
  * @return {object} a standard response object
  */
  function urlExecute_ ( urlTail , params , options) {
    
    // set default options
    options = cUseful.Utils.vanMerge ([{
      method:"GET",
      muteHttpExceptions:true,
      headers: {
        "Authorization": "Bearer " + accessToken_
      }
    }, options]);
    
    // the param string
    if (params) {
      var paramString = Array.isArray(params) ? params.join ("&") : params;
    }
    paramString = paramString ? "?"+paramString : "";

    
    var response = cUseful.Utils.expBackoff( function () {
      return UrlFetchApp.fetch(getBaseUrl_ () + urlTail + paramString, options);
    });
    
    // trnsmit what happened
    if (response.getResponseCode() !== 200) {
      
      return {
        response:response, 
        success:false,
        err:response.getContentText()
      }
    }
    else {
      try {
        var ob = JSON.parse (response.getContentText());
        
        return{
          response:response,
          data:ob,
          success:!ob.error,
          err:ob.error
        }; 
        
        
      }
      catch (err) {
        return {
          response:response,
          success:false,
          err:err
        }
      }
    }
  };

};

