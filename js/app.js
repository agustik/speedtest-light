var app = angular.module('speedtest', ["chart.js"]);

var worker = new Worker('js/worker.js');



app.controller('speedtest', ['$scope', '$interval', function ($scope, $interval){

  $scope.statistics = {};

  $scope.server = window.location.origin;

  $scope.colors = [
    '#2e6da4',
    '#d43f3a'
  ];

  // Speed chart
  //

  $scope.speedChartLabels = [];
/*
  for (var i = 0; i < 50; i ++ ){
     $scope.speedChartLabels.push('');
  }*/

  $scope.speedChartSeries = ['Download', 'Upload'];
  $scope.speedChartData = [
    [],
    []
  ];


  var ticks = {
    beginAtZero:true,
    callback: function(label, index, labels) {

      return humanSpeed(label);
    }
  };

  var scaleLabel = {
      display: true,
      labelString: '1k = 1000'
  };

  $scope.speedChartOptions = {
    animation: false,
    scales: {
      yAxes: [
        {
          id: 'y-axis-1',
          type: 'linear',
          display: true,
          position: 'left',
          pointRadius : 0,
          ticks: ticks
        },
        {
          id: 'y-axis-2',
          type: 'linear',
          display: true,
          position: 'right',
          pointRadius : 0,
          ticks: ticks
        }
      ]
    }
  };


  //
  //
  $scope.red =['#d43f3a', '#dcdcdc'];

  $scope.blue =['#2e6da4', '#dcdcdc'];

  $scope.light =['#97bbcd', '#dcdcdc'];


  $scope.labels = ['Status', ''];

  $scope.overall = {
    avg : {
      download : 0,
      upload : 0
    }
  };

  $scope.options = {
    tooltips : {
      enabled : false
    }
  }

  $scope.dlStatus = [0, 1];

  $scope.ulStatus = [0, 1];

  $scope.latStatus = [0,1];


  $scope.avgDLSpeed = 0;
  $scope.avgULSpeed = 0;

  var int;

  $scope.start = function (){
    worker.postMessage({action : 'start', server : $scope.server});

    $interval(updateChart, 500);
  }

  $scope.stop = function (){
    worker.postMessage({action : 'abort'});

    $interval.cancel(int);
  }

  function getSpeed(array){
    return array.map(function (item){
      return item.speed;
    });
  }

  function scaleSpeed(speed){

    return speed;
    if (speed > 1024){
      return speed / 1024;
    }

    if (speed > (1024 * 1024)){
      return speed / (1024 * 1024);
    }

  }

  function updateChart(){

    var data = $scope.statistics;

    if (!data.current) return;

    if (data.current.current === 'download'){
      $scope.speedChartLabels.push('');
      $scope.speedChartData[0].push(data.overall.avg.download);
    }

    if (data.current.current === 'upload'){
      if ($scope.speedChartData[1] <= $scope.speedChartData[0]){
        $scope.speedChartData[1].push(data.overall.avg.upload);
      }
    }
  }

  worker.onmessage = function (message){

    if (message.data.type === 'stats'){
      $scope.statistics = message.data;

      $scope.dlStatus[0]=message.data.overall.percentage.download;
      $scope.ulStatus[0]=message.data.overall.percentage.upload;
      $scope.latStatus[0]=message.data.overall.percentage.latency;

      $scope.dlStatus[1]=100 - message.data.overall.percentage.download;
      $scope.ulStatus[1]=100 - message.data.overall.percentage.upload;
      $scope.latStatus[1]=100 - message.data.overall.percentage.latency;

      $scope.overall = message.data.overall;

      setTimeout(function (){
        $scope.$apply();
      }, 10)
    }

    if (message.data.type === 'finish'){
      console.log('Test done!')
      $interval.cancel(int);
    }

  }
}]);


function humanSpeed(bytes, precision){

  if (bytes <= 0) return "-";

  if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
  bytes = bytes * 8;
  if (typeof precision === 'undefined') precision = 1;
  var units = ['bites/s', 'kb/s', 'mb/s', 'gb/s', 'tb', 'PB'],
    number = Math.floor(Math.log(bytes) / Math.log(1024));


  var u = units[number] || units[0];
  return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + u;
}

app.filter('speed', function() {
	return humanSpeed;
});


app.filter('latency', function() {
	return function (ms){
    if (!ms) return "-";
    if (ms === Infinity || ms == -Infinity) return "-";
    return ms.toFixed(2) + ' ms';
  }
});
