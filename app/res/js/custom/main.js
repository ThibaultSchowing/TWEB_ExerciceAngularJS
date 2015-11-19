var tweb = angular.module('tweb', ['ngRoute', 'ngAnimate','chart.js']);
// var io = require('socket.io');
tweb.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'res/partials/home.html',
                    controller: 'home'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }]);

tweb.controller('home', function($scope, serveurSync) {
  // Données et labels
	$scope.datas = "";
  $scope.labels = [];
  $scope.data = [];

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
  serveurSync.connection();
  serveurSync.getResults();

	$scope.vote = function(index){
		serveurSync.voter(index);
	};
});

tweb.factory('serveurSync', function(){
	var sock;
	var _cbResults = null;

// on recoit le tableau complet du serveur

  var _connection = function(){
    sock = io.connect();
    sock.on('sendResult', function(datas){
  		if (_cbResults !== null)
  			_cbResults(datas);
  	});

  };


	var _voter = function(index){
		sock.emit('registerResult', index);
	};

	var _registerCbs = function(cbResults) {
		_cbResults = cbResults;
	};

  var _getResults = function(){
    sock.emit('askResult');
  };

	return {
		voter: _voter,
		registerCbs: _registerCbs,
    getResults: _getResults,
    connection: _connection
	}
});
