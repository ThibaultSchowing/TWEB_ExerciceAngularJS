var tweb = angular.module('tweb', ['ngRoute', 'ngAnimate','chart.js']);
// var io = require('socket.io');
tweb.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'res/partials/home.html',
                    controller: 'home'
                }).
                when('/graphs', {
                  templateUrl: 'res/partials/graphs.html',
                  controller: "graphsCtrl"
                }).
                when('/vote', {
                  templateUrl: 'res/partials/vote.html',
                  controller: "voteCtrl"
                }).
                otherwise({
                    redirectTo: '/'
                });
        }]);

tweb.controller('HeaderController', function($scope, $location){
  $scope.isActive = function (viewLocation) {
    return viewLocation === $location.path();
  };
});

tweb.controller('graphsCtrl', function($scope, serveurSync){

  // Données et labels
	$scope.datas = "";
  $scope.labels = [];
  $scope.data = [];

  serveurSync.registerCbs(function(datas){
		$scope.datas = datas;

    var tabLabels = [];
    var tabValues = [];

    for (var i = 0; i < datas.length; i++){
      tabLabels.push(datas[i].name);
      tabValues.push(datas[i].count);
    }

    $scope.labels = tabLabels;
    $scope.data = tabValues;
    $scope.$apply(); // Merci Simon
	});
  serveurSync.connection();
  serveurSync.getResults();
});

tweb.controller('voteCtrl', function($scope, serveurSync){
  $scope.vote = function(index){
		serveurSync.voter(index);
    console.log("Client vote from vote page");
	};
});

tweb.controller('home', function($scope, serveurSync) {

  $scope.title = "Are you a squirel ?";
  // Données et labels
	$scope.datas = "";
  $scope.labels = [];
  $scope.data = [];


  console.log("RegisterCbs...");
//données affichée sur la page home.html
	serveurSync.registerCbs(function(datas){
		$scope.datas = datas;

    var tabLabels = [];
    var tabValues = [];

    for (var i = 0; i < datas.length; i++){
      tabLabels.push(datas[i].name);
      tabValues.push(datas[i].count);
    }

    $scope.labels = tabLabels;
    $scope.data = tabValues;
    $scope.$apply(); // Merci Simon
	});
  ///////
  console.log("Connection ...");
  serveurSync.connection();
  console.log("GetResults...");
  serveurSync.getResults();

	$scope.vote = function(index){
		serveurSync.voter(index);
	};

  $scope.reset = function(){
    serveurSync.reset();
  };
});

tweb.factory('serveurSync', function(){
	var sock = null;
	var _cbResults = null;

// on recoit le tableau complet du serveur

  var _connection = function(){
    if(sock === null){
      sock = io.connect();
      sock.on('sendResult', function(datas){
  		  if (_cbResults !== null)
  			 _cbResults(datas);
  	   });
    };
  };

  var _reset = function(){
    sock.emit('reset');
  };

	var _voter = function(index){
		sock.emit('registerResult', index);
	};

	var _registerCbs = function(cbResults) {
		_cbResults = cbResults;
	};

  var _getResults = function(){
    console.log("sending askResult message");
    sock.emit('askResult');
  };

	return {
		voter: _voter,
		registerCbs: _registerCbs,
    getResults: _getResults,
    connection: _connection,
    reset: _reset
	}
});
