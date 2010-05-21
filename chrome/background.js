var MIN_WIDTH = 400;
var MAX_WIDTH = 1024;
var NARROW_PARENT_IF_NOT_FIT = true;

function Windows(){}
Windows.prototype = [];

Windows.prototype.get = function get(id) {
	for (var i=0; i<this.length; i++) {
		if (this[i].id === id) {
			return this[i];
		}
	}
	console.warn(arguments.callee.caller.name +" didn't find #"+id);
	return null;
};

Windows.prototype.add = function add(w) {
	var i = this.length;
	while (i--) {
		if (this[i].id === w.id) {
			return this;
		}
	}
	this.push(w);
	return this;
};

Windows.prototype.merge = function merge(windows) {
	for (var i=0; i<windows.length; i++) {
		this.add(windows[i]);
	}
	return this;
};

Windows.prototype.remove = function remove(id) {
	// A - B - C
	//      \
	//       D
	//
	// remove(B)
	//
	// A - C
	//  \
	//   D

	for (var i=0; i<this.length; ++i) {
		var w = this[i];
		if (w.id === id) {
			if (w.parent) {
				// Delete children
				for (var j=0; j<w.parent.children.length; j++) {
					if (w.parent.children[j].id === id) {
						w.parent.children.splice(j, 1);
						break;
					}
				}
				if (w.children) {
					// Add children to a parent
					w.parent.children = w.parent.children.concat(w.children);
					// Update link to a new parent
					for (var p=0; p<w.children.length; p++) {
						delete w.children[p].parent;
						w.children[p].parent = w.parent;
					}
				}

			}
			return this.splice(i, 1)[0];
		}
	}
	return null;
};


var all = new Windows;
chrome.windows.getAll(null, function rememberAll(windows) {
	all.merge(windows);
});

function getChildrenOf(w) {
	var children = [];
	if (w && w.children) {
		for (var i=0; i<w.children.length; i++) {
			children.push(w.children[i]);
			children = children.concat(getChildrenOf(w.children[i]));
		}
	}
	return children;
}

function getChildren(id) {
	var w = all.get(id);
	return getChildrenOf(w);
}

var OS_WINDOWS = navigator.platform.indexOf("Win") > -1;

var focusedId;
chrome.windows.getLastFocused(function rememberFocused(w) {
	focusedId = w.id;
});
chrome.windows.onFocusChanged.addListener(function rememberFocusedId(id) {
	// http://groups.google.com/a/chromium.org/group/chromium-extensions/browse_frm/thread/b8044b4eb8ba1d3f
	if (id === focusedId || OS_WINDOWS && !all.get(id)) {
		return null;
	}
	focusedId = id;
});

var created;
chrome.windows.onCreated.addListener(function rememberCreated(w) {
	created = w;
	var focused = all.get(focusedId);
	if (!focused) {
		console.warn('Something wrong with focused window.')
	}
	if (focused.children) {
		focused.children.push(w);
	} else {
		focused.children = [w];
	}
	w.parent = focused;
	all.add(w);
	update(w);
});

function update(w, callback) {
	var father = w.parent;
	if (!father) {
		console.warn('No parent', w);
		return;
	}
	chrome.windows.get(father.id, function updateParent(parent) {
		if (!parent) {
			console.warn('Father is gone', father);
			return;
		}
		var position = {
			top: parent.top
		};
		if (!w.children || !w.children.length) {
			var emptyWidth = screen.width - parent.left - parent.width;
			position.width = Math.min(emptyWidth, MAX_WIDTH);
			if (NARROW_PARENT_IF_NOT_FIT && position.width < MIN_WIDTH) {
				position.width = MIN_WIDTH;
				parent.width += emptyWidth - MIN_WIDTH;
				chrome.windows.update(father.id, {
					width: parent.width
				}, function empty(){});
			}
		}
		position.left = parent.left + parent.width;
		chrome.windows.update(w.id, position, callback);
	});
}

function updateChildren(children) {
	if (!children || !children.length) {
		return;
	}
	function next() {
		var first = children.shift();
		if (!first) return;
		update(first, next);
	}
	next();
}


chrome.extension.onRequest.addListener(function requested(request) {
	if (request.method === 'update') {
		chrome.windows.getCurrent(function gotCurrent(w){
			var children = getChildren(w.id);
			updateChildren(children);
		});
	} else if (request.method && request.popup) {
		chrome.windows[request.method](request.popup, function empty(){});
	}
});

chrome.windows.onRemoved.addListener(function removed(windowId) {
	var w = all.remove(windowId);
	var children = getChildrenOf(w);
	updateChildren(children);
});
