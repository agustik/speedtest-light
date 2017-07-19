/*
var w = new Worker('js/test.js');

*/


var tests = [

  /*{ file : '128kb',   count : 20 },
  { file : '256kb',   count : 15  },
  { file : '512kb',   count : 10 },
  { file : '1mb',     count : 5  },
  { file : '10mb',    count : 2  },
  { file : '50mb',    count : 2  },*/
  { file : '10mb',   count : 1  }
]

var randomString = new Date().getTime();

var Bench = function (settings){

  var runtime = settings.runtime || 10000;
  function sum(array){
    return array.reduce(function (a,b,c){
      return a+b;
    });

  }

  var statistics = {
    download : [],
    upload : [],
    latency : []
  };

  var currentJob = "";
  var file = false;

  function avg(array){
    var _sum = sum(array);
    return sum / array.length;
  }

  return {
    start : function (callback){
      var _self = this;

      async.waterfall([
        _self._download,
        _self._upload
      ], function waterfallDone(err){
        console.log('ALL DONE', err);
      });
      return this;
    },
    _download : function (done){
      currentJob = 'Download';

      var count = new Array(3);

      var requests = [];
      async.forEachLimit(count, 1, function (i, next){
        var request = http.request({
          uri : settings.download  + '?r=' + randomString,
          progress: function (stats){
            statistics.download.push({
              speed: stats.__speed,
              time: new Date().getTime(),
              timeTaken : stats.timeStamp
            });
          }
        }, function (err, res){
          if (!file){
            file = res;
          }
          next();
        });

        requests.push(request);
      },  function (){
        done(null);
      });

      /*setTimeout(function abort(){
        console.log('REQ', requests);
      }, 3000);*/
    },
    _upload : function (done){

      currentJob = 'Upload';

      var count = new Array(3);

      var requests = [];

      async.forEachLimit(count, 1, function (i, next){
         var request = http.request({
          uri : settings.upload,
          method : 'POST',
          data: file,
          progress: function (stats){
            statistics.upload.push({
              speed: stats.__speed,
              time: new Date().getTime(),
              timeTaken : stats.timeStamp
            });
            console.log('Uploading,,,',  settings.upload, stats, stats.__percentage);
          }
        }, function (err, res){
          console.log('Done with upload', err);
          next();
        });
        requests.push(request);
      }, function (){
        done(null);
      });


      /*setTimeout(function abort(){
        console.log('ABORTING!!!!')
        _self.req.abort();
        _self.req = false;
        //done();
      }, runtime);*/

    },
    _latency : function (){

    },
    statistics : function (){
        return {
          avgSpeed : ''
        }
    }
  }
}

function toMB(size){
  return size / 1024 / 1024;
}

var bench =  Bench({
  download : 'http://quark.lsh.is/download/files/1mb',
  upload : 'http://quark.lsh.is/upload',
  runtime : 10000000
});

bench.start();


console.log(bench);
