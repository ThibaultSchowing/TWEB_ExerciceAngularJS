var tweb = angular.module('tweb', ['ngRoute', 'ngAnimate','chart.js']);

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
	});

	$scope.vote = function(index){
		serveurSync.voter(index);
	};
});

tweb.factory('serveurSync', function(){
	var sock = io.connect();
	var _cbResults = null;

// on recoit le tableau complet du serveur
	sock.on('sendResult', function(datas){
		if (_cbResults !== null)
			_cbResults(datas);
	});

	var _voter = function(index){
		sock.emit('registerResult', index);
	};

	var _registerCbs = function(cbResults) {
		_cbResults = cbResults;
	};

	return {
		voter: _voter,
		registerCbs: _registerCbs
	}
});
