var currentTestName = '';

// QUnit-like adapter
function equals(expected, actual) {
	if (expected !== actual) {
		console.warn('NOT EQUAL', currentTestName, expected, actual);
	} else {
		console.log('PASS', currentTestName, actual);
	}
}

function test(func) {
	currentTestName = func.name;
	func();
}

function ok(bool, message) {
	if (bool) {
		console.log('PASS', currentTestName, message);
	} else {
		console.warn('FAIL', currentTestName, message);
	}
}


test(function Window_get(){
	var ids = [
		{id: 3},
		{id: 14},
		{id: 15}
	];
	equals(14, Windows.prototype.get.call(ids, 14).id);
	equals(15, Windows.prototype.get.call(ids, 15).id);
	equals(3,  Windows.prototype.get.call(ids,  3).id);
});

test(function Window_add(){
	var ids = [
		{id: 4},
		{id: 8},
		{id: 15},
		{id: 16},
		{id: 23}
	];
	Windows.prototype.add.call(ids, {id: 23});
	equals(5, ids.length);
	Windows.prototype.add.call(ids, {id: 42});
	equals(23, ids[4].id);
	equals(42, ids[5].id);
	equals(6, ids.length);
});

test(function Window_remove(){
	var ids = [
		{id: 11, children: []},
		{id: 13, children: []},
		{id:131, children: []}
	];
	ids[2].parent = ids[1];
	ids[1].children[0] = ids[2];
	Windows.prototype.remove.call(ids, 13);
	equals(2, ids.length);
	ok(!ids[2], 'Deleted');
	equals(11,  ids[0].id);
	equals(131, ids[1].id);
	ok(!ids[1].parent, 'Parent deleted');
	equals(0, ids[1].children.length);
});

test(function _getDescendantsOf(){
	var w = {
		id: 1,
		children: [
			{id: 11},
			{id: 12},
			{id: 13, children: [
				{id: 131}
			]},
			{id: 14}
		]
	};
	var children = getDescendantsOf(w);
	equals(5, children.length);
	equals(11, children[0].id);
	equals(131, children[3].id);
});
