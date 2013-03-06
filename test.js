var bonds = require('./bonds'),
	Atom = bonds.Atom,
	Molecule = bonds.Molecule,
	Context = bonds.Context,
	Tree = bonds.Tree,
	utils = bonds.utils;
	
var Timer = function() {
	var startTime;
	this.start = function() {
		startTime = new Date().getTime();
	};
	this.end = function() {
		return new Date().getTime() - startTime;
	};
};
var timer = new Timer();
var assert = function(assertion, fn) {
	timer.start();
	var resp = fn();
	if( resp !== true ) {
		console.error("\x1B[31mFailed\x1B[39m `"+assertion+"`!", JSON.stringify(resp));
	} else {
		console.log("\x1B[32mPassed\x1B[39m `"+assertion+"` in "+timer.end()+" ms.");
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
			
		// take crossProduct and flatten result
		var cross = utils.crossProduct(hs, os).reduce(utils.concat).map(utils.reducer(utils.concat));
		return utils.flatEqual(cross.map(utils.mapper(utils.attr("number"))), [[6,6],[6,6,7],[6,6,7,7],[6],[6,7],[6,7,7],[],[7],[7,7]]);
	});
	
	assert("Combining of multiple repeat elements", function() {
		var h = new Atom("H", 7),
			o = new Atom("O", 6);
	
		// map to permutations and reduce with combinations
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
		return utils.flatEqual(molecule.subMolecules().map(utils.chain(utils.mapper(utils.attr("number")), utils.attr("atoms"))), [[6,6],[6,6,7],[6,6,7,7],[6,7],[6,7,7],[7,7]]);
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
		
		var ch = solve.filter(function(bond) {
			return (bond[0][0] == 'C' && bond[1][0] == 'H') || (bond[1][0] == 'C' && bond[0][0] == 'H');
		});
		var cc = solve.filter(function(bond) {
			return (bond[0][0] == 'C' && bond[1][0] == 'C');
		});
		
		// verify number of bonds of each type
		return ch.length == 4 && cc.length == 1;
	});
	
	assert("Organic chemistry", function() {
		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,c,c,c,c,c,h,h,h,h,h,h,h,h,h,h,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		
		var ch = solve.filter(function(bond) {
			return (bond[0][0] == 'C' && bond[1][0] == 'H') || (bond[1][0] == 'C' && bond[0][0] == 'H');
		});
		var cc = solve.filter(function(bond) {
			return (bond[0][0] == 'C' && bond[1][0] == 'C');
		});
		
		// verify number of bonds of each type
		return ch.length == 14 && cc.length == 5;
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
		var coords = tree.coordinates();
		
		var elemOfCoord = function(coord) {
			for( var k in coords ) if( utils.flatEqual(coord, coords[k]) ) return k;
			return "";
		};
		
		var shapes = tree.draw(new Context()),
			bonds = [];			
		shapes.forEach(function(shape) {
			if( shape.type == "line" ) { bonds.push(shape.points.map(elemOfCoord)); }
		});
				
		// make sure all bonds drawn are as calculated
		return solve.filter(function(bond) {
			return bonds.filter(function(drawnBond) {
				return (drawnBond[0] == bond[0] && drawnBond[1] == bond[1]) || (drawnBond[0] == bond[1] && drawnBond[1] == bond[0]);
			}).length == 0;
		}).length == 0;
	});
})();