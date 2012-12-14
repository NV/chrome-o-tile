'use strict';

var prevWidth = window.outerWidth;
var timeoutId = 0;

window.addEventListener('resize', function resized(e) {
	if (prevWidth === window.outerWidth) {
		return;
	}
	if (timeoutId !== 0) {
		clearTimeout(timeoutId);
	}
	timeoutId = setTimeout(function debounced() {
		chrome.extension.sendRequest({method: 'resize'});
		prevWidth = window.outerWidth;
		timeoutId = 0;
	}, 100);
}, false);
