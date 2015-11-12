var tweb = angular.module('tweb', ['ngRoute', 'ngAnimate', 'chart.js']);

tweb.factory('ServerPushPoll', function (DisplayErrorMessagesFromAPI) {
	var _sio;
	var _connectedUsers = [];


	var _cbOnUserConnect = null;
	var _cbOnUserDisconnect = null;
	var _cbOnAudienceList = null;

	var _cbOnPollDetails = null;
	var _cbOnNextQuestion = null;
	var _cbOnPollCompleted = null;
	var _cbOnVotingOnThisQuestionEnded = null;
	var _cbOnVoteResult = null;

	var _cbOnLiveVoteResults = null;

	var _cbOnDuplicateConnection = null;

	var _catchUp = function() {
		_sio.emit('catchUp');
	}

	var _registerLiveVoteResults = function(cbOnLiveVoteResults) {
		_cbOnLiveVoteResults = cbOnLiveVoteResults
	}

	var _registerBasicPollEvents = function(cbOnDuplicateConnection, cbOnPollDetails, cbOnNextQuestion, cbOnPollCompleted, cbOnVotingOnThisQuestionEnded, cbOnVoteResult) {
		_cbOnDuplicateConnection = cbOnDuplicateConnection;
		_cbOnPollDetails = cbOnPollDetails;
		_cbOnNextQuestion = cbOnNextQuestion;
		_cbOnPollCompleted = cbOnPollCompleted;
		_cbOnVotingOnThisQuestionEnded = cbOnVotingOnThisQuestionEnded;
		_cbOnVoteResult = cbOnVoteResult;
	};

	var _registerEventsWhenPeopleConnectAndDisconnect = function(cbOnUserConnect, cbOnUserDisconnect, cbOnAudienceList) {
		_cbOnUserConnect = cbOnUserConnect;
		_cbOnUserDisconnect = cbOnUserDisconnect;
		_cbOnAudienceList = cbOnAudienceList;
	};

	var _goNextQuestion = function() {
		_sio.emit('goNextQuestion');
	};

	var _vote = function(answerIndex, voteAsAnonymous) {
		_sio.emit('vote', { 'answerIndex': answerIndex, 'voteAsAnonymous': voteAsAnonymous});
	};

	var _connect = function(host, port, session, pollIdToJoin, cbJoinedAsSpeaker, cbJoinedAsAudience) {
		if (host == null || port == null) {
			_sio = io.connect(); // same host
		} else {
			_sio = io.connect(host + ':' + port);
		}

		_sio.on('authAndJoinResult', function(authAndJoinResult) {
			if (authAndJoinResult.status == 'ok') {
				//alert('Join poll success, as: ' + authAndJoinResult.data);
				if (authAndJoinResult.data == 'speaker') {
					cbJoinedAsSpeaker();
				} else {
					cbJoinedAsAudience();
				}
			} else {
				alert('Join poll failure: ' + DisplayErrorMessagesFromAPI(authAndJoinResult.messages));
			}
		});

		_sio.on('userConnect', function(user) {

			//alert('userConnect received');

			_connectedUsers.push(user);
			//alert('New user: ' + user._id);

			if (_cbOnUserConnect != null) {
				_cbOnUserConnect(_connectedUsers);
			}
		});

		_sio.on('userDisconnect', function(userId) {

			//alert('userDisconnect received');

			var newList = [];
			var usersCount = _connectedUsers.length;
			for (var i=0; i < usersCount; i++) {
				if (_connectedUsers[i]._id != userId) {
					newList.push(_connectedUsers[i]);
				}
			}

			_connectedUsers = newList;

			if (_cbOnUserDisconnect != null) {
				_cbOnUserDisconnect(_connectedUsers);
			}
		});

		_sio.on('audienceList', function(audienceList) {

			_connectedUsers = audienceList;

			//alert('audienceList received');

			if (_cbOnAudienceList != null) {
				_cbOnAudienceList(_connectedUsers);
			}
		});

		_sio.on('nextQuestion', function(nextQuestion) {

			//alert('nextQuestion received');

			var assign = nextQuestion.allowAnonymous ? null : false;

			var usersCount = _connectedUsers.length;
			for (var i=0; i < usersCount; i++) {
				_connectedUsers[i].voted = assign;
			}

			if (_cbOnNextQuestion != null) {
				_cbOnNextQuestion(nextQuestion);
			}
		});

		_sio.on('pollCompleted', function() {
			if (_cbOnPollCompleted != null) {
				_cbOnPollCompleted();
			}
		});

		_sio.on('votingOnThisQuestionEnded', function() {
			if (_cbOnVotingOnThisQuestionEnded != null) {
				_cbOnVotingOnThisQuestionEnded();
			}
		});

		_sio.on('voteResult', function(result) {
			if (_cbOnVoteResult != null) {
				_cbOnVoteResult(result);
			}
		});

		_sio.on('liveVoteResults', function(results) {

			// null if catching up or anonymous vote
			if (results.whovoted != null) {
				var usersCount = _connectedUsers.length;
				for (var i=0; i < usersCount; i++) {
					if (_connectedUsers[i]._id == results.whovoted) {
						_connectedUsers[i].voted = true;
					}
				}
			}

			if (_cbOnLiveVoteResults != null) {
				_cbOnLiveVoteResults(results);
			}
		});

		_sio.on('pollDetails', function(results) {
			if (_cbOnPollDetails != null) {
				_cbOnPollDetails(results);
			}
		});

		_sio.on('duplicateConnection', function(results) {
			if (_cbOnDuplicateConnection != null) {
				_cbOnDuplicateConnection();
			}
		});

		_sio.on('connect', function() {
			//alert('Socket connected');
			_sio.emit('authAndJoin', { 'session': session, 'poll': pollIdToJoin });
		});
	};

	return {
		connect: _connect,
		registerEventsWhenPeopleConnectAndDisconnect: _registerEventsWhenPeopleConnectAndDisconnect,
		connectedUsers: _connectedUsers,
		registerBasicPollEvents: _registerBasicPollEvents,
		goNextQuestion: _goNextQuestion,
		vote: _vote,
		registerLiveVoteResults: _registerLiveVoteResults,
		catchUp: _catchUp
	}
});


tweb.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'res/partials/home.html',
                    controller: 'home'
                }).
                when('/login', {
                    templateUrl: 'res/partials/viewpoll.html',
                    controller: 'viewpoll'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }]);

tweb.controller('home', function($scope, $http) {

	$scope.usersCount = 0;
	$scope.pollsCount = 0;
	$scope.openPollsCount = 0;

	$scope.$on('$viewContentLoaded', function() {
		$http({
			method: 'GET',
			url: "/api/v1/stats/",
			cache: false
		})
		.success(function(data, status, headers, config) {
			$scope.usersCount = data.usersCount;
			$scope.pollsCount = data.pollsCount;
			$scope.openPollsCount = data.openPollsCount;
		}).error(function(data, status, headers, config) {
			alert("Could not retrieve stats: http error");
		});
	});
});


tweb.controller('pollspeaker', function($scope, $location, UserDataFactory, ServerPushPoll) {
	$scope.userSession = UserDataFactory.getSession();

	var pollId = $location.search().id;

	$scope.pollName = '';
	$scope.currentQuestionNumber = 0;
	$scope.totalQuestions = 0;

	$scope.connected = ServerPushPoll.connectedUsers;
	$scope.currentQuestion = {};
	$scope.displayQuestion = false;
	$scope.votingIsAllowed = false;
	$scope.goNextQuestionAllowed = true;
	$scope.hasPollEnded = false;
	$scope.timerHdl = null;
	$scope.timerRemaining = 0;
	$scope.votingAsAnonymousIsAllowed = false;

	$scope.totalVotesCount = 0;
	var chartVotingActivity;
	var chartVotingActivityData = [
			{
				label: 'Votes',
				strokeColor: '#A31515',
				data: [{
					x: 0,
					y: 0
				}]
			}];

	$scope.startTimer = function() {
		$scope.timerHdl = setInterval(function() {
									     $scope.timerRemaining = $scope.timerRemaining - 1;
										 $scope.$apply();

										 if ($scope.timerRemaining <= 0) {
											 $scope.stopTimer();
										 }
									 }, 1000);
	};

	$scope.stopTimer = function() {
		if ($scope.timerHdl != null) {
			clearTimeout($scope.timerHdl);
			$scope.timerHdl = null;
		}
	};

	$scope.goNextQuestion = function() {
		$scope.goNextQuestionAllowed = false;
		ServerPushPoll.goNextQuestion();
	};

	$scope.viewPollResults = function() {
		$location.path("/pollview").search({ 'id': pollId });
	};

	$scope.labels = [];
	$scope.data = [];
	$scope.options = { animationSteps: 20 };

	ServerPushPoll.registerEventsWhenPeopleConnectAndDisconnect(function(newConnectedList) {
																	//alert('userconnect processing');
																	// One user joined
																	$scope.connected = newConnectedList;
																	$scope.$apply();
															    },
																// Workaround. Even $apply doesn't work. Enjoy.
																function(newConnectedList) {
																	//alert('userDisconnect processing');
																	// One user disconnected
																	$scope.connected = newConnectedList;
																	$scope.$apply();
																},
																function(newConnectedList) {
																	//alert('audienceList processing');
																	// When the speaker joins, the list of already connected is received
																	$scope.connected = newConnectedList;
																	$scope.$apply();
																});


	ServerPushPoll.registerBasicPollEvents(function() {
												// Never happens for the speaker
											},
											function(pollDetails) {
												$scope.$apply(function() {
													$scope.pollName = pollDetails.name;
												});
											}, function(question) {

											   // question.voted is unused
											   var nextQuestion = question.question;
											   var timeout = question.timeout;

											   $scope.timerRemaining = timeout;

											   if (timeout > 0) {
													$scope.startTimer();
													$scope.currentQuestionNumber = question.current;
													$scope.totalQuestions = question.total;

													// Next question
													$scope.votingIsAllowed = true;
													$scope.votingAsAnonymousIsAllowed = nextQuestion.allowAnonymous;
													$scope.goNextQuestionAllowed = false;
											   }

											   var graphLabels = [];
											   var graphValues = [];
											   var answersCount = nextQuestion.answers.length;
											   for (var i = 0; i < answersCount; i++) {
												   nextQuestion.answers[i].count = 0;
												   graphLabels.push(nextQuestion.answers[i].name);
												   graphValues.push(0);
											   }

											   $scope.labels = graphLabels;
											   $scope.data = graphValues;

											   $scope.currentQuestion = nextQuestion;
											   $scope.displayQuestion = true;

											   $scope.totalVotesCount = 0;
											   $scope.createPartitipationGraph();

											   $scope.$apply();
										   },
										   function() {
											   // Poll completed
											   $scope.hasPollEnded = true;
											   $scope.votingIsAllowed = false;
											   $scope.goNextQuestionAllowed = false;
											   $scope.stopTimer();
											   $scope.$apply();
										   },
										   function() {
											   // Question timeout
											   $scope.votingIsAllowed = false;
											   $scope.goNextQuestionAllowed = true;
											   $scope.stopTimer();
											   $scope.$apply();
										   },
										   function(voteResult) {
											   // Vote result
											   // Do nothing. The speaker cannot vote.
										   });

	ServerPushPoll.registerLiveVoteResults(function(results) {
											   var timing = results.timing;
											   var resultsCount = results.results.length;
											   var graphValues = [];
											   for (var i = 0; i < resultsCount; i++) {
												   var count = results.results[i].count;
												   $scope.currentQuestion.answers[i].count = count;
												   graphValues.push(count);
											   }

											   $scope.data = graphValues;


											   $scope.totalVotesCount = $scope.totalVotesCount + 1;

											   // null when catching up
											   if (timing != null) {
												   chartVotingActivity.datasets[0].addPoint(timing, $scope.totalVotesCount);
												   chartVotingActivity.update();
											   }

											   $scope.$apply();
										   });


	$scope.createPartitipationGraph = function() {
		var ctx3 = document.getElementById("votingactivity").getContext("2d");
		chartVotingActivity = new Chart(ctx3).Scatter(chartVotingActivityData, {
			bezierCurve: false,
			showTooltips: false,
			scaleShowHorizontalLines: true,
			scaleShowLabels: false,
			scaleBeginAtZero : true,
			scaleType: "number",
			scaleShowVerticalLines: false,
			scaleLabel: "<%=value%> votes"
		});
	};

	$scope.$on('$viewContentLoaded', function() {
		$scope.createPartitipationGraph();

		ServerPushPoll.catchUp();
	});
});


tweb.controller('polljoin', function($scope, $location, UserDataFactory, ServerPushPoll) {
	$scope.userSession = UserDataFactory.getSession();
	var pollIdToJoin = $location.search().id;

	//alert('Joining poll: ' + pollIdToJoin);
	socketIOConnectToServer(ServerPushPoll,
	                        UserDataFactory.getSession(),
	                        pollIdToJoin,
							function() {
							   $location.path("/pollspeaker").search({ 'id': pollIdToJoin });
							   $scope.$apply();
						   }, function() {
								$location.path("/pollaudience").search({ 'id': pollIdToJoin });
								$scope.$apply();
						   }
	);

});

function socketIOConnectToServer(spp, session, pollIdToJoin, cbAsSpeaker, cbAsAudience) {
	spp.connect(null, null, session, pollIdToJoin,
	            cbAsSpeaker, cbAsAudience);
}
