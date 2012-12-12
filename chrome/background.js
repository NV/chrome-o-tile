'use strict';

var MIN_WIDTH = 400;
var NARROW_PARENT_IF_NOT_FIT = true;

function getMaxWidth() {
	return screen.availWidth;
}


function BrowserWindow() {
	this.parent = null;
	this.children = [];

	// http://developer.chrome.com/extensions/windows.html#type-Window
	this.id = 0;
	this.focused = false;
	this.top = 0;
	this.left = 0;
	this.width = 0;
	this.height = 0;
	this.tabs = [];
	this.incognito = false;
	this.incognito = false;
	this.type = '';
	this.state = '';
	this.alwaysOnTop = false;
}

BrowserWindow.from = function(w) {
	var browserWindow = new BrowserWindow();
	browserWindow.merge(w);
	return browserWindow;
};

BrowserWindow.prototype.get = function(getInfo, callback) {
	var w = this;
	if (typeof callback === 'undefined') {
		callback = getInfo;
		getInfo = null;
	}
	chrome.windows.get(w.id, getInfo, function(win) {
		w.merge(win);
		callback(w);
	});
};

BrowserWindow.prototype.update = function(properties, callback) {
	this.merge(properties);
	chrome.windows.update(this.id, properties, callback || null);
};

BrowserWindow.prototype.merge = function(properties) {
	var keys = Object.keys(properties);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		this[key] = properties[key];
	}
};

BrowserWindow.prototype.valueOf = function valueOf() {
	return this.id;
};

BrowserWindow.prototype.toString = function toString() {
	var result = this.id.toString();
	if (this.children.length) {
		result += ': ' + this.children.join(', ');
	}
	return result;
};


function WindowsDict() {
	this.lastFocusedId = 0;
}

WindowsDict.prototype.get = function(id, getInfo, callback) {
	var w = this[id];
	w.get(getInfo, callback);
};

WindowsDict.prototype.add = function add(w) {
	if (this[w.id]) {
		console.info('window#' + w.id + ' is already in the dict');
	}
	if (!(w instanceof BrowserWindow)) {
		// Only for testing
		w = BrowserWindow.from(w);
	}
	this[w.id] = w;
};

WindowsDict.prototype.remove = function remove(id) {
	// A - B - C
	//      \
	//       D
	//
	// remove(B)
	//
	// A - C
	//  \
	//   D

	var w = this[id];
	if (w) {
		if (w.parent) {
			// Delete children
			for (var i = 0; i < w.parent.children.length; i++) {
				if (w.parent.children[i].id === id) {
					w.parent.children.splice(i, 1);
					break;
				}
			}
			[].push.apply(w.parent.children, w.children);
		}
		// Update a link to a new parent
		for (var p = 0; p < w.children.length; p++) {
			w.children[p].parent = w.parent;
		}
		var removed = this[id];
		this[id] = null;
		return removed;
	} else {
		console.warn('window#' + id + ' cannot be removed since it is not present.');
	}
	return null;
};

WindowsDict.prototype.getCurrent = function(callback) {
	var dict = this;
	chrome.windows.getCurrent(function gotCurrent(win) {
		var w = dict[win.id];
		w.merge(win);
		callback(w);
	});
};

WindowsDict.prototype.getLastFocused = function() {
	if (this.lastFocusedId !== 0) {
		var lastFocused = this[this.lastFocusedId];
		if (lastFocused) {
			return lastFocused;
		} else {
			console.warn('lastFocusedId (' + this.lastFocusedId + ') is gone');
			return null;
		}
	}
};

WindowsDict.prototype.appendToFocused = function(w) {
	var focused = this.getLastFocused();
	w.parent = focused;
	focused.children.push(w);
	this.add(w)
};

WindowsDict.prototype.toString = function toString() {
	return Object.keys(this).map(function(key) {
		return this[key];
	}).join('\n ');
};


var all = new WindowsDict;


chrome.windows.getLastFocused(function rememberFocused(w) {
	if (w.id > 0) {
		all.lastFocusedId = w.id;
	}
});


chrome.windows.getAll(null, function rememberAll(windows) {
	for (var i = 0; i < windows.length; i++) {
		all.add(windows[i]);
	}
});


var OS_WINDOWS = navigator.platform.indexOf("Win") > -1;

chrome.windows.onFocusChanged.addListener(function rememberFocusedId(id) {
	// http://crbug.com/39882
	// http://crbug.com/44706
	if (id === chrome.windows.WINDOW_ID_NONE || OS_WINDOWS && !all[id]) {
		return null;
	}
	all.lastFocusedId = id;
});


chrome.windows.onCreated.addListener(function rememberCreated(win) {
	var w = BrowserWindow.from(win);
	var focused = all.getLastFocused();
	if (focused) {
		if (w.type == 'normal' && focused.children[0] && focused.children[0].type == 'normal') {
			var child = focused.children[0];
			w.get({populate: true}, function(w) {
				chrome.tabs.move([w.tabs[0].id], {
					windowId: child.id,
					index: -1
				}, function(tab) {
					child.update({focused: true}, function() {
						if (tab.length) {
							console.warn('tab is an array');
							tab = tab[0];
						}
						chrome.tabs.update(tab.id, {
							active: true
						})
					});
				});
			});
			return;
		}
	} else {
		console.warn('Something wrong with focused window.');
	}

	if (w.type == 'popup') {
		var prevFocusedId = all.lastFocusedId;
		w.get({populate: true}, function(w) {
			if (w.tabs[0].url.indexOf('chrome-devtools://') === 0) {
				all.lastFocusedId = prevFocusedId;
				addWindow(w);
			}
		});
	} else {
		addWindow(w);
	}

});


function addWindow(w) {
	all.appendToFocused(w);
	update(w, function empty(){});
}


function update(w, callback) {
	var father = w.parent;
	if (!father) {
		console.warn('No parent', w);
		return;
	}

	getLastNonMinimized(father, function updateParent(parent) {
		var position = {
			top: 0,
			left: 0
		};
		if (parent) {
			position.top = parent.top;
			if (!w.children || !w.children.length) {
				var emptyWidth = screen.availWidth - parent.left - parent.width;
				position.width = Math.min(emptyWidth, getMaxWidth());
				if (NARROW_PARENT_IF_NOT_FIT && position.width < MIN_WIDTH) {
					position.width = MIN_WIDTH;
					parent.width += emptyWidth - MIN_WIDTH;

					father.update({
						width: parent.width
					});
				}
			}
			position.left = parent.left + parent.width;
		}
		w.update(position, callback);
	});
}


function getLastNonMinimized(w, callback) {
	if (!w) {
		callback(null);
	}
	w.get(function(w) {
		if (w.state === 'minimized') {
			var parent = w.parent;
			getLastNonMinimized(parent, callback);
		} else {
			callback(w);
		}
	});
}


function updateChildren(children) {
	if (!children.length) {
		return;
	}
	function next() {
		var first = children.shift();
		if (!first) return;
		update(first, next);
	}
	next();
}


function getDescendantsOf(w) {
	var children = [];
	if (w && w.children) {
		for (var i=0; i<w.children.length; i++) {
			children.push(w.children[i]);
			[].push.apply(children, getDescendantsOf(w.children[i]));
		}
	} else {
		console.error('No children');
		debugger;
	}
	return children;
}


chrome.extension.onRequest.addListener(function requested(request) {
	if (request.method === 'update') {
		all.getCurrent(function(w) {
			var children = getDescendantsOf(w);
			updateChildren(children);
		});
	} else if (request.method && request.popup) {
		chrome.windows[request.method](request.popup, function empty(){});
	}
});


chrome.windows.onRemoved.addListener(function removed(windowId) {
	var w = all.remove(windowId);
	if (!w) {
		return;
	}
	if (w.parent) {
		w.parent.get(function(parent) {
			//FIXME: tile with leftmost children
			var width = parent.width + w.width;
			parent.update({width: Math.min(width, getMaxWidth())});
		});
	} else {
		var children = getDescendantsOf(w);
		updateChildren(children);
	}
});
