var bonds = require('./bonds'),
	Atom = bonds.Atom,
	Molecule = bonds.Molecule,
	Tree = bonds.Tree,
	utils = bonds.utils;
	
assert = function(assertion, fn) {
	var resp = fn();
	if( resp !== true ) {
		console.error("Assertion failed: ", assertion, JSON.stringify(resp));
	} else {
		console.log("Assertion Passed");
	}
};

(function() {
	assert("Construction of molecules", function() {
		var atom = new Atom("O", 6);
		var molecule = new Molecule([atom]);
		return -1 != molecule.atoms.indexOf(atom);
	});
	
	assert("O is origin of H2O", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
		var molecule = new Molecule([h, h, o]);
		return molecule.isOrigin(o);
	});
	
	assert("H2O has an origin", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
		var molecule = new Molecule([h, h, o]);
		return molecule.hasOrigin() == "O";
	});
	
	assert("Cross product of two permutations", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
	
		var hs = utils.permutations(h, 2),
			os = utils.permutations(o, 2);
		var cross = utils.crossProduct(hs, os).reduce(utils.concat).map(utils.reducer(utils.concat));
		return utils.flatEqual(cross.map(utils.mapper(utils.attr("number"))), [[6,6],[6,6,7],[6,6,7,7],[6],[6,7],[6,7,7],[],[7],[7,7]]);
	});
	
	assert("Combining of multiple repeat elements", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
	
		var permute = [[h,2], [o, 2]].map(utils.permutations.apply.bind(utils.permutations, {})).reduce(utils.combinations);
		return utils.flatEqual(permute.map(utils.mapper(utils.attr("number"))), [[6,6],[6,6,7],[6,6,7,7],[6],[6,7],[6,7,7],[],[7],[7,7]]);
	});
	
	assert("Molecule summary", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
	
		var molecule = new Molecule([h, h, o]);
		return utils.flatEqual(utils.listConstituents(molecule.atoms).map(utils.attr(1)), [2, 1]);
	});
	
	assert("Sub-molecules", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
	
		var molecule = new Molecule([h, h, o, o]);
		return utils.flatEqual(molecule.subMolecules().map(function(mol){return mol.clean(1)}), [[6,6],[6,6,7],[6,6,7,7],[6,7],[6,7,7],[7,7]]);	
	});
	
	assert("Recognize R1, R2, and R3 neutralizable molecules", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var R1 = new Molecule([c,h,h,h]);
		var R2 = new Molecule([c,h,h]);
		var R3 = new Molecule([c,h]);
		return R1.R1Neutralizable() == "C" &&
				R2.R2Neutralizable() == "C" &&
				R2.R2Neutralizable() == "C";
	});
	
	assert("Find R1, R2, and R3 neutralizable sub-molecules", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,c,h,h,h,h]);
		
		return utils.flatEqual(molecule.R2Groups().map(function(group){ return group.R2Neutralizable(); }), ["R","C"]);
	});
	
	assert("Branch solving of molecule", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,c,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		return utils.flatEqual(solve, [['H,1,0','C,1,0','1'],
		 ['H,1,1','C,1,0','1'],
		 ['H,0,0','C,0,2','1'],
		 ['H,0,1','C,0,2','1'],
		 ['C,0,2','C,1,0','2']]);
	});
	
	assert("Organic chemistry", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,c,c,c,c,c,h,h,h,h,h,h,h,h,h,h,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		return utils.flatEqual(solve, [['H,5,0','C,5,0','1'],
		 ['H,5,1','C,5,0','1'],
		 ['H,5,2','C,5,0','1'],
		 ['H,0,0','C,0,3','1'],
		 ['H,0,1','C,0,3','1'],
		 ['H,0,2','C,0,3','1'],
		 ['C,0,3','C,1,3','1'],
		 ['H,1,1','C,1,3','1'],
		 ['H,1,2','C,1,3','1'],
		 ['C,1,3','C,2,3','1'],
		 ['H,2,1','C,2,3','1'],
		 ['H,2,2','C,2,3','1'],
		 ['C,2,3','C,3,1','1'],
		 ['H,3,1','C,3,1','1'],
		 ['H,3,2','C,3,1','1'],
		 ['C,3,1','C,4,3','1'],
		 ['H,4,1','C,4,3','1'],
		 ['H,4,2','C,4,3','1'],
		 ['C,4,3','C,5,0','1']]);
	});
	
	assert("Coordinates from bonds", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		
		var tree = new Tree(solve);
		return utils.flatEqual(tree.bondLines(), [{ from:[0,0], to:[1,0], bonds:"1"},
		{ from:[1,0], to:[1,-1], bonds:"1"},
		{ from:[1,0], to:[2,0], bonds:"1"},
		{ from:[1,0], to:[1,1], bonds:"1"}]);
	});
	
	assert("Plotting of bonds and atoms", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		
		var tree = new Tree(solve);
		return utils.flatEqual(tree.draw(), [{type: "line", points: [[0,0],[1,0]]},
		{type: "line", points: [[1,0],[1,-1]]},
		{type: "line", points: [[1,0],[2,0]]},
		{type: "line", points: [[1,0],[1,1]]},
		{type: "circle", points: [0,0]},
		{type: "circle", points: [1,0]},
		{type: "circle", points: [1,-1]},
		{type: "circle", points: [2,0]},
		{type: "circle", points: [1,1]}]);
	});
})();