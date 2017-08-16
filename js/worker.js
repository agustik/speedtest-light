

var worker = {};
if (!this.window){

  self.importScripts('http.js', 'https://cdnjs.cloudflare.com/ajax/libs/async/2.5.0/async.min.js');
  worker = self;
}

var Speedtest = function (settings){


  var counts = settings.count || 5;
  var concurrency = settings.concurrency || 1;


  var latencyCount = settings.latencyCount || 100;

  var count = [];

  var lcount= [];

  for (var i = 0; i < counts; i++){
    count.push(i);
  }

  for (var i = 0; i < latencyCount; i++){
    lcount.push(i);
  }

  var runtime = settings.runtime || 10000;
  function sum(array){

    if (array.length === 0) return 0;
    return array.reduce(function (a,b,c){
      return a+b;
    });
  }

  var statistics = {
    download : [],
    upload : [],
    latency : [],
    overAllPercentage : 0,
    percentage : {
      upload : 0,
      download : 0,
      latency : 0
    }
  };

  var requests = [];

  var tmp = {};

  var x= {
    upload : [],
    download : []
  };

  var currentJob = "";
  var file = false;

  function avg(array){
    var _sum = sum(array);

    return _sum / array.length;
  }

  function max(array){
    return Math.max.apply(null, array);

  }
  function min(array){
    return Math.min.apply(null, array);
  }

  function median(array){
    var ar = array.slice();
    var sorted = ar.sort(function(a,b) { return a - b;});
    var middle = Math.floor((sorted.length - 1) / 2);
    if (sorted.length % 2) {
        return sorted[middle];
    } else {
        return (sorted[middle] + sorted[middle + 1]) / 2.0;
    };
  }

  function createDummyData(size, callback){
    setTimeout(function (){

      var blobArray = [];

      var tmpArray = [];

      size = size / 1000;

      for (var i = 0; i < size; i ++){
        tmpArray.push( Math.floor(Math.random()));
      };

      for (var i = 0; i < 1000 / 2; i ++ ){
        blobArray.push(tmpArray);
      };

      var blob = new Blob(blobArray, {type: 'text/plain'});

      blobArray = null;

      tmpArray = null;

      return callback(blob);

    }, 0);
  }


  function getValues(key, array){
    return array.map(function (item){
      return item[key];
    });
  }

  function getOverAllStatistics() {

    var dl  = getValues('speed', statistics.download);
    var ul = getValues('speed', statistics.upload);
    var lat =statistics.latency;


    return {
      avg : {
        download  : avg(dl),
        upload    : avg(ul),
        latency   : avg(lat),
      },
      max : {
        download  : max(dl),
        upload    : max(ul),
        latency   : max(lat),
      },
      min : {
        download  : min(dl),
        upload    : min(ul),
        latency   : min(lat),
      },
      median : {
        download  : median(dl),
        upload    : median(ul),
        latency   : median(lat),
      },
      percentage : statistics.percentage
    };
  };


  function progress(key, requestNumber, status){
    var stats = {};

    if (key === 'latency') {
      statistics.latency.push(status.__time);

      var pr = (requestNumber /  latencyCount) * 100;
      statistics.percentage[key] = (requestNumber /  latencyCount) * 100;
      stats = {
        latency : status.__time
      };
    }

    if (key === 'upload' || key === 'download'){

      var array = statistics[key];

      x[key][requestNumber] = status.__percentage;

      statistics.percentage[key] = sum(x[key]) / counts;

      var jobID = [key, requestNumber].join(':');

      tmp[jobID] = status.__percentage;

      var i = 0;

      Object.keys(tmp).forEach(function (k){
        i += tmp[k];
      });

      statistics.overAllPercentage = (i / ( counts * 100 * 2)) * 100;

      stats = {
        job : jobID,
        current : key,
        speed: status.__speed,
        time: new Date().getTime(),
        timeTaken : status.__time,
        percentage: status.__percentage,
      };

      array.push(stats);
    }


    settings.stats(stats, getOverAllStatistics(), statistics);
  }

  var workerFunctions = {
    latency : function latency(i, callback){
      var now = new Date().getTime();

      settings.log('Checking latency')

      var request = http.request({
       uri : settings.upload + '?r=' + now
     }, function (err, res, rawResponse){
       // Fix time, it is to much .. some latency in this code..
       rawResponse.__time = (new Date().getTime() - now) * 0.7;
       progress('latency',i, rawResponse);

       callback();
     });
     requests.push(request);
    },
    download : function download(i, callback){
      var now = new Date().getTime();
      var request = http.request({
        uri : settings.download  + '?r=' + now,
        progress: function (stats){
          progress('download', i, stats);
        }
      }, function (err, res){
        res = null;
        callback();
      });
      requests.push(request);
    },
    upload : function upload(i, callback){
      var now = new Date().getTime();

      settings.log('About to upload')
      var request = http.request({
       uri : settings.upload + '?r=' + now,
       method : 'POST',
       data: file,
       progress: function (stats){
         progress('upload', i, stats);
       }
     }, function (err, res){
       res = null;
       callback();
     });
     requests.push(request);
    }
  };


  var workers = {
    latency : function latency(callback){
      async.forEachLimit(lcount, concurrency, workerFunctions.latency, function (){
        settings.log('Latency check finish');
        statistics.percentage.latency = 100;
        progress(false);
        callback();
      })
    },
    download : function download(callback){
      var timeout;
      currentJob = 'Download';
      settings.log('Download starting');
      async.forEachLimit(count, concurrency, workerFunctions.download, function (){
        clearInterval(timeout);
        settings.log('Download finish');
        statistics.percentage.download = 100;
        progress(false);
        callback();
      });

      timeout = setTimeout(function (){
        progress(false);
        settings.error('Time is up!');
        requests.forEach(function (req){

          return req.abort();
        });

        requests = [];
        callback();
      }, settings.runtime);
    },
    upload : function upload(callback){
      currentJob = 'Upload';
      settings.log('Upload starting');
      async.forEachLimit(count, concurrency, workerFunctions.upload, function (){
        clearInterval(timeout);
        file = false;
        statistics.percentage.upload = 100;
        settings.log('Upload finish');
        progress(false);
        callback();
      });

      timeout = setTimeout(function (){
        progress(false);
        settings.error('Time is up!');
        console.log('TIME IS UP!')
        requests.forEach(function (req){

          return req.abort();
        });
        requests = [];
        callback();
      }, settings.runtime);
    }
  };


  return {
    start : function (callback){
      // Restet all stuff
      statistics = {
        download : [],
        upload : [],
        latency : [],
        overAllPercentage : 0,
        percentage : {
          upload : 0,
          download : 0,
          latency : 0
        }
      };
      requests = [];
      tmp = {};
      x= {
        upload : [],
        download : []
      };
      currentJob = "";
      file = false;

      var _self = this;

      console.log('Create dummy data for upload');

      createDummyData(50000000, function (blob){
        console.log(blob.length, blob.size);
        file = blob;
        async.waterfall([
          workers.download,
          workers.upload,
          workers.latency
        ], function waterfallDone(err){
          console.log('ALL DONE', err);
          progress(false);
          settings.finish();
        });
      });
      return this;
    },
    abort : function (){
      progress(false);
      console.log('Stopping ajax!')
      requests.forEach(function (req){
        return req.abort();
      })
    }
  }
}

function toMB(size){
  return size / 1024 / 1024;
}




this.addEventListener('message', function (message) {

  if (message.data.action === 'start'){
    var test =  Speedtest({
      download : message.data.server+ '/download/files/50mb',
      upload : message.data.server+ '/upload',
      runtime : 120000,
      count : 20,
      stats : function stats(current, overAll, raw){
        if (worker.postMessage){
          worker.postMessage({
            type : 'stats',
            current : current,
            overall : overAll,
            raw : raw
          });
        }
      },
      error : function error(message){
        if (worker.postMessage){
          worker.postMessage({
            type : 'error',
            message : message
          });
        }
      },
      log : function log(message){
        if (worker.postMessage){
          worker.postMessage({
            type : 'log',
            message : message
          });
        }
      },
      finish : function done(){
        if (worker.postMessage){
          worker.postMessage({
            type : 'finish'
          });
        }
      }
    });
    return test.start();

   }
  if (message.data.action === 'abort') return test.abort();

});

//test.start();
