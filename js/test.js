

this.CLOSURE_IMPORT_SCRIPT = function(path) {
  importScripts(path);
  return true;
};

importScripts('http.js');
var FOOBAR = 'FUCK!!!!'


http.request({
  uri : 'img.jpg',
  method : 'POST',
  data : 'SOME SILLY DATA!!!',
  headers : {
    'X-foobar': 'FUCK'
  },
  progress : function (stats){
    console.log('stats', stats);
  }
});
