'use strict';

// Simplified version of http://code.google.com/p/jquery-debounce/
Function.prototype.debounce = function debounce(timeout, invokeAsap) {
	var fn = this, timer;
	return function debounced() {
		var args = arguments;
		var context = this;
		invokeAsap && !timer && fn.apply(context, args);
		clearTimeout(timer);
		timer = setTimeout(function waiting() {
			!invokeAsap && fn.apply(context, args);
			timer = null;
		}, timeout);
	};
};

var prevWidth = outerWidth;

function resized(e) {
	if (prevWidth === outerWidth) {
		return;
	}
	chrome.extension.sendRequest({method: 'update'});
	prevWidth = outerWidth;
}

window.addEventListener('resize', resized.debounce(100), false);
