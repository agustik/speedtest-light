'use strict';

var http = (function (self){

  var isWorker = (self.window) ? true : false;
  var json = {
    parse : function (data){
      try {
        return JSON.parse(data)
      } catch (e) {
        return false;
      }
    },
    stringify : function (data){
      try {
        return JSON.stringify(data)
      } catch (e) {
        return false;
      }
    }
  };

  function fixUri(uri){
    if (uri.indexOf('://') > -1) return uri;
    return self.location.protocol + '//' + self.location.host + '/' + uri;
  }

  function fn(){};
  var http = {
    get : function (){

    },
    post : function (){

    },
    request : function (object, callback){

      var requiredFields = ['uri'];

      callback = callback || fn;

      if (!object || typeof object !== 'object') throw "Must be object!";

      requiredFields.forEach(function (field){
        if (!object[field]) throw field + ' is required!';
      })

      var uri = object.uri;

      var payload = null;

      var isBinary = false;

      if (object.data){

        if (object.data instanceof Blob){
          payload = object.data;
          isBinary = true;
        }else if (typeof object.data === 'object'){
          payload = json.stringify(object.data);
        }else if (typeof object.data === 'string'){
          payload = object.data;
        }
      }

      if (object.form){
        payload = new FormData();

        for (var key in object.form){
          payload.append(key, object.form[key]);
        }
      }



      if (isWorker){
        uri = fixUri(uri);
      }
      var method = object.method || 'GET';

      var progress = (typeof object.progress === 'function') ? object.progress : fn;


      var req = new XMLHttpRequest();
      req.addEventListener("load", function (res){
        callback(null, res.currentTarget.response, res);
      });
      req.addEventListener("error", function (res){
        callback(res);
      });


      function progressListener(stats){
        stats.__percentage = (stats.loaded / stats.total) * 100;
        stats.__speed = (stats.loaded / stats.timeStamp);
        progress(stats);
      }


      req.addEventListener("progress", progressListener);

      req.open(method.toString().toUpperCase(), fixUri(object.uri), true);

      if (isBinary){
        req.responseType = "arraybuffer";
      }
      req.timeout = object.timeout || 0;
      req.ontimeout = object.ontimeout || fn;

      for (var header in object.headers){
        var value = object.headers[header];
        req.setRequestHeader(header, value)
      }


      if ((method === 'POST'|| method === 'PUT') && object.data ){
        req.upload.onprogress = progressListener;
      }

      req.send(payload);

      return req;
    }
  }

  return http;
})(this);
