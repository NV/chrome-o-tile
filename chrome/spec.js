Windows.prototype.get.spec = function(){
	var ids = [
		{id: 3},
		{id: 14},
		{id: 15}
	];
	var fourteen = Windows.prototype.get.call(ids, 14).id;
	if (fourteen === 14) {
		console.log('Windows.prototype.get() passed');
	} else {
		console.warn('Windows.prototype.get()', ids);
	}
};
Windows.prototype.get.spec();


Windows.prototype.add.spec = function(){
	var ids = [
		{id: 4},
		{id: 8},
		{id: 15},
		{id: 16},
		{id: 23}
	];
	Windows.prototype.add.call(ids, {id: 23});
	Windows.prototype.add.call(ids, {id: 42});
	if (ids[5].id === 42 && ids.length === 6) {
		console.log('Windows.prototype.add() passed');
	} else {
		console.warn('Windows.prototype.add()', ids);
	}
};
Windows.prototype.add.spec();


Windows.prototype.remove.spec = function(){
	var ids = [
		{id: 11},
		{id: 13, children: [
			{id: 131}
		]},
		{id: 131}
	];
	ids[1].children[0].parent = ids[2].parent = ids[2];

	Windows.prototype.remove.call(ids, 13);
	if (ids.length !== 2 && ids[1].id === 131 && (!ids[1].children || ids[1].children.length === 0)) {
		console.warn(this.name, ids);
	} else {
		console.log(this.name, 'passed');
	}
};
Windows.prototype.remove.spec();


getChildrenOf.spec = function(){
	var windows = {
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

	var children = getChildrenOf(windows);
	if (children.length !== 5) {
		console.warn(children);
	} else {
		console.log(this.name, 'passed')
	}
};
getChildrenOf.spec();