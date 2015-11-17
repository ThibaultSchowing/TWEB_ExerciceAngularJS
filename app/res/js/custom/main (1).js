var tweb = angular.module('tweb', ['ngRoute', 'ngAnimate']);

tweb.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'res/partials/home.html',
                    controller: 'home'
                }).
                when('/login', {
                    templateUrl: 'res/partials/login.html',
                    controller: 'login'
                }).
				when('/polls', {
                    templateUrl: 'res/partials/polls.html',
                    controller: 'polls'
                }).
				when('/join', {
                    templateUrl: 'res/partials/join.html',
                    controller: 'join'
                }).
                otherwise({
                    redirectTo: '/login'
                });
        }]);

		
tweb.controller('home', function($scope, serveurSync) {
	$scope.datas = "";
	
	serveurSync.registerCbs(function(datas){
		$scope.datas = datas;
	});
	
	$scope.vote = function(index){
		serveurSync.voter(index);
	};
});

tweb.factory('serveurSync', function(){
	var sock = io.connect();
	var _cbResults = null;
	
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

tweb.controller('login', function($scope) {
	$scope.message = 'Page: login';
});

tweb.controller('polls', function($scope) {
	$scope.message = 'Page: polls';
});

tweb.controller('join', function($scope) {
	$scope.message = 'Page: join';
});
