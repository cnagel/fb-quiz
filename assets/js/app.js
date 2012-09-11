
var maxDegree = 10;
var maxTime = 60;
var start = undefined;
var candidate = undefined;
var final_round_started = false;
var show_tips_time = 2500;
var cache = true;

window.fbAsyncInit = function() {

	var init = function() {

		/* INIT */
		FB.init({
			appId : 449994241710661, // App ID
			channelUrl : 'channel.html', // Channel File
			status : true, // check login status
			cookie : true, // enable cookies to allow the server to access the
							// session
			xfbml : true // parse XFBML
		});

	};
	init();

	/* CHECK LOGIN STATUS */
	FB.getLoginStatus(function(response) {
		
		// check connection
		if (!response.status || response.status != 'connected') {
			$('#stage').append('<div class="fb-login-button" scope="user_interests,user_groups,user_likes,user_birthday,user_events,user_location,friends_interests,friends_groups,friends_likes,friends_birthday,friends_events,friends_location">Login with Facebook</div>');
			init();
			return;
		}
		
		get_the_friends();
		
	});
	
};

// Load the SDK Asynchronously
(function(d){
   var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement('script'); js.id = id; js.async = true;
   js.src = "//connect.facebook.net/en_US/all.js";
   ref.parentNode.insertBefore(js, ref);
 }(document));

var get_the_friends = function() {
	
	var fql = $.jStorage.get('fql');
	if(cache && fql) {
		console.log('get fql from cache');
		process_fql(fql);
	} else {
		console.log('get fql from fb');
		FB.api(	{
			method: 'fql.multiquery',
			queries : {
				'user': 'SELECT uid, name, birthday_date, sex, current_location FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me())',
				'user_to_page': 'SELECT uid, page_id FROM page_fan WHERE uid IN (SELECT uid FROM #user)',
				'page': 'SELECT page_id, name, fan_count, type FROM page WHERE page_id IN (SELECT page_id FROM #user_to_page)' } },
				function(response) {
					$.jStorage.set('fql', response, { TTL : 120 * 60 * 1000 });
					console.log('received fql from fb');
					process_fql(response);
				});
	}
};

var process_fql = function(response) {

	var friends = {  };
	var pages = {  };
	var candidates = [  ];

	//console.log(response);
				
	// iterate over user
	$(response[0].fql_result_set).each(function(index, user) {
		friends[user.uid] = user;
		user.pages = new Array();
	} );
	
	// iterate over pages
	//console.log(response[2].fql_result_set);
	$(response[2].fql_result_set).each(function(index, page) {
		var type = page.type;
		if(type == 'MUSICIAN/BAND' || type == 'TV' || type == 'TV SHOW' || type == 'MOVIE' || type == 'SPORTS LEAGUE') {
			pages[page.page_id] = page;
		}
	} );	
	//console.log(pages);
	
	// iterate over pages
	$(response[1].fql_result_set).each(function(index, user_to_page) {
		var page_id = user_to_page.page_id;
		if(pages[page_id] != undefined) {
			friends[user_to_page.uid].pages.push(pages[page_id]);
		}
	} );
	
	// filter friends
	$.each(friends, function() {
		// check age
		var birthday = this.birthday_date;
		if (birthday == null || birthday.length == 5) return;
		this.age = getAge(birthday);
		// check current place
		if(!this.current_location) return;
		// check pages
		if(this.pages.length < 10) return;
		
		candidates.push(this);
	} );
	
	init_game(candidates, friends);
	

}

function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

var init_game = function(candidates, friends) {
	// get candidate
	var numOptions = 12;
	var randomPos = Math.floor(Math.random() * numOptions);
	var index = Math.floor(Math.random() * candidates.length);
	candidate = candidates[index];
	
	var options = new Array();
	
	var temp = new Array();
	$.each(friends, function() {
		if(candidate != this) temp.push(this);
	} );
	// get options
	while(options.length < numOptions && temp.length > 0) {
		if(options.length == randomPos) {
			options.push(candidate);
		} else {
			var index = Math.floor(Math.random() * temp.length);
			options.push(temp[index]);
			temp[index] = temp.pop();
		}
	}
	
	// add option images
	var html = '';
	$(options).each(function(index, user) {
		var degree = Math.random() * maxDegree * 2 - maxDegree;
		html +=
			(index % 4 == 0 ? '<div class="row-fluid">' : '' ) + 
			'<div class="cell"><div class="polaroid show" data-uid="' + user.uid + '" style="-webkit-transform: rotate(' + degree + 'deg); -moz-transform: rotate(' + degree + 'deg);"><div class="image"><img src="https://graph.facebook.com/' + user.uid + '/picture?type=large" alt="" /></div>' + user.name + '</div></div>' +
			(index % 4 == 3 ? '</div>' : '');
	} );
	$('#stage').append(html);
	
	// add click events
	$('#stage .polaroid').click(function(event) {
		if($(this).data('uid') == candidate.uid) {
			click_right();
		} else {
			click_wrong();
		}
	} );
	
	// add first tip
	show_tip(candidate, 0);
	
	$('#start_button').css('visibility', 'visible');
	
};

var click_right = function() {
	stop_all_timer();
	$('#counter').html('');
	$('#modal .modal-body').html('<div id="success"><img src="assets/img/like_button1.png" />You won!<br />Press F5 to play again.</div>');
	$('#modal .modal-body').css('height', 500);
	$('#start_button').css('visibility', 'hidden');
	$('#modal').show();
	
};

var click_wrong = function() {
	puff('Wrong! You missed');
	maxTime -= 5;
	var seconds_left = Math.ceil(maxTime - (new Date().getTime() - start.getTime()) / 1000);
	if(seconds_left < 10) {
		seconds_left = '0' + seconds_left;
	}
	init_counter('00:' + seconds_left);
};

var removeWrongOptionsTimer = undefined;
var tipTimer = undefined;
var start_game = function() {
	start = new Date();
	// start remove wrong options timer
	removeWrongOptionsTimer = window.setInterval(function() {
		if($('#stage .show').size() > 2) {
			var count = 0;
			while(count < 2) {
				var index = Math.floor(Math.random() * $('#stage .show').size());
				var polaroid = $('#stage .show')[index];
				if($(polaroid).data('uid') != candidate.uid) {
					$(polaroid).removeClass('show');
					$(polaroid).fadeOut(2000, function() { $(this).css({ display: 'block', visibility: 'hidden' }); });
					count++;
				}
			}
		} else {
			window.clearInterval(removeWrongOptionsTimer);
		}
	}, 10000);
	// start tip counter
	tipTimer = window.setTimeout(function() { show_tip(candidate, 1); }, show_tips_time);
	// start countdown
	init_counter('01:00');
};

var init_counter = function(time) {
	$('#counter').html('');
	$('#counter').countdown({
          image: 'assets/img/digits.png',
          startTime: time,
          timerEnd: function(){ final_round(); },
          format: 'mm:ss'
    });
}

var show_tip = function(candidate, number) {
	if(number == 0) {
		// age
		$('#show').append('<div id="age" class="first"><img src="assets/img/calendar2.png" alt="calendar" />Age: ' + candidate.age + '</div>');
		// location
		var location = candidate.current_location;
		$('#show').append('<div id="location" class="first"><img src="assets/img/places_transparent.png" alt="location" />' + location.city + '</div>');
	} else { 
		var pages = candidate.pages;
		var index = Math.floor(Math.random() * pages.length);
		var page = pages[index];
		pages[index] = pages.pop();
		var degree = Math.random() * maxDegree * 2 - maxDegree;
		$('#show').append('<div class="polaroid" id="page-' + page.page_id + '" style="-webkit-transform: rotate(' + degree + 'deg); -moz-transform: rotate(' + degree + 'deg);"><div class="image"><img src="https://graph.facebook.com/' + page.page_id + '/picture?type=large" alt="" /></div><strong>' + page.type + '</strong>: ' + page.name + '</div>');
		var offset = $('#show').offset();
		var width = 760 - 200 - 120;
		$('#page-' + page.page_id).css( {
			left: offset.left + 200 + Math.random() * width,
			top: offset.top + Math.random() * 50 });
		
		if(candidate.pages.length > 1) {
			tipTimer = window.setTimeout(function() { show_tip(candidate, number + 1); }, show_tips_time);
		}
	}
}

var stop_all_timer = function() {
	window.clearInterval(removeWrongOptionsTimer);
	window.clearTimeout(tipTimer);
};

var final_round = function(candidate) {
	if(start.getTime() + maxTime * 1000 > new Date().getTime()) {
		return;
	}
	if(final_round_started) return;
	final_round_started = true;
	stop_all_timer();
	puff('Final round<br />Choose one');
};

var puff = function(message) {
	$('body').append('<div id="puff">' + message + '</div>');
	$('#puff').hide("puff", {}, 1000);
	window.setTimeout(function() { $('#puff').remove(); }, 1000);
}