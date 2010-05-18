var prevWidth = outerWidth;

window.addEventListener('resize', function resized(e) {
	if (prevWidth === outerWidth) {
		return;
	}
	chrome.extension.sendRequest({method: 'update'});
	prevWidth = outerWidth;
}, false);
