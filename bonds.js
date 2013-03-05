// Utilities
var constant = function(x) { return function() { return x; }; };
var identity = function(x) { return x; };

// functional forms of basic operators
var add = function(a, b) { return a+b; };
var gt = function(a, b) { return a>b; };
var concat = function(a, b) { return b.concat(a); };
var multiply = function(a, b) { return a*b; };
var attr = function(attr) { return function(elm) {return elm[attr]; } };
var call = function(attr) { return function(elm) {return elm(attr); } };

// convenience functions to keep things clean
var chain = function(a, b) { return function(elm) {return a(b(elm))} };
var list = function(length) { return length?Array(length).join(0).split(0):[]; };
var range = function(length) { return list(length).map(function(_,n){return n;}); }
var unique = function(a,b) { return a.map?(a.indexOf(b)!=-1 ? a : a.concat(b)):(a==b?[a]:[a,b]) }
var arrayize = function(x) { return x.map ? x : [x]; };
var zip = function(a) { return function(b) { return [a,b] }; };
var whereNot = function(regexp) { return function(elm) { return !elm.match(regexp) }; }

// two-dimensional array helpers
var mapper = function(fn) { return function(elm) { return elm.map(fn); }; };
var reducer = function(fn) { return function(elm) { return elm.reduce(fn); }; };

// lazy implementation of object comparison
var flatEqual = function(a, b) { return JSON.stringify(a) == JSON.stringify(b); };

// Functions used to make subgroups
var permutations = function(elm, count) { return range(count+1).map(range).map(mapper(constant(elm))); };
var crossProduct = function(a, b) { return b.map(chain(a.map(zip).map.bind(a.map(zip)), call)); };
var combinations = function(a, b) { return crossProduct(a, b).reduce(concat).map(reducer(concat)) };
var listConstituents = function(list) { 
	list = list.sort(gt); 
	return arrayize(list.reduce(unique)).map(function(a){
		return [a, list.length - list.slice().reverse().indexOf(a) - list.indexOf(a)]; 
	});
};

// Atom name parser
var getLevel = function(center) { return center.match(/[0-9]+/) ? center.match(/[0-9]+/)[0] : ""; };

// Classes
var solved = false;
var Atom = function(label, ve) {
	this.name = label;
	this.number = ve;
};
var Molecule = function(atoms) {
	this.atoms = atoms;
};
Molecule.prototype = {
	output: function(center, subMolIndex) {
		// Recursively generates a list of the form:
		/*
			H,0,0,0-C,0,0,1-1;H,0,0,2-C,0,0,3-1;
		*/
		// Then splits at `;` and splits at `-` to bear a...
		// ... two-dimensional array.
		subMolIndex = subMolIndex || 0;
		var subMolCount = 0;
		return this.atoms.map(function(atom, index) {	
			if( atom.subMol ) {
				subMolCount++;
				return atom.subMol.output(atom.subMolCenter, subMolCount)+";"+atom.subMolCenter+"-"+center+"-"+atom.bondCount;
			}
			return ""+atom.name+","+getLevel(center)+","+subMolIndex+","+index+"-"+center+"-"+(8-atom.number);
		}).join(";");
	},
	isOrigin: function(atom) {
		var index = this.atoms.indexOf(atom);
		return (8-atom.number) == this.atoms
					.filter(function(_,i){return i!=index})
					.map(attr("number"))
					.map(multiply.bind({}, -1))
					.map(add.bind({}, 8))
					.reduce(add, 0);
	},
	hasOrigin: function() {
		return this.atoms.filter(this.isOrigin.bind(this)).map(attr("name"))[0]
	},
	subMolecules: function() {
		var permute = listConstituents(this.atoms).map(permutations.apply.bind(permutations, {}));
		return permute.reduce(combinations).filter(function(atoms){return atoms.length>1}).map(function(atoms){return new Molecule(atoms)});
	},
	R1Neutralizable: function() {
		var withR1 = new Molecule(this.atoms.concat(new Atom("R", 7)));
		return withR1.hasOrigin();
	},
	R2Neutralizable: function() {
		var withR2 = new Molecule(this.atoms.concat(new Atom("R", 6)));
		return withR2.hasOrigin();
	},
	R3Neutralizable: function() {
		var withR3 = new Molecule(this.atoms.concat(new Atom("R", 5)));
		return withR3.hasOrigin();
	},
	R1Groups: function() {
		return this.subMolecules().filter(function(mol) { return mol.R1Neutralizable(); });
	},
	R2Groups: function() {
		return this.subMolecules().filter(function(mol) { return mol.R2Neutralizable(); });
	},
	R3Groups: function() {
		return this.subMolecules().filter(function(mol) { return mol.R3Neutralizable(); });
	},
	branchSolve: function(cb, depth) {
		var subcount = 0;
		if( depth == undefined ) { solved = false; }
		depth = depth || 0;
		if( solved ) { return; }
		if( this.hasOrigin() ) {	
			var originIndex = this.atoms.map(attr("name")).indexOf(this.hasOrigin());			
			var molecule = new Molecule(this.atoms.filter(function(_,i){ return i!=originIndex; }));
				 			
			cb(molecule.output(""+[this.hasOrigin(),depth,this.atoms.map(attr("name")).indexOf(this.hasOrigin())]).split(';').map(function(pair) {
				return pair.split('-');
			})); 
			solved = true;
			return;
		}
		if( this.R1Groups().length ) {
			var atoms = this.atoms.slice();
			var R1Groups = this.R1Groups(),
				lengths = R1Groups.map(attr("atoms")).map(attr("length")),
				R1Group = R1Groups[lengths.indexOf(Math.max.apply({}, lengths))];

			var remaining = [];
			R1Group.atoms.forEach(function(RMember) {
				var index = atoms.indexOf(RMember);				
				remaining.push(atoms[index]);
				delete atoms[index];
			});
			
			var origin = R1Group.R1Neutralizable(),
				originIndex = R1Group.atoms.map(attr("name")).indexOf(origin),
				nonOrigins = R1Group.atoms.filter(function(_,i){return i!=originIndex});

			atoms.push({ name: "R1|"+depth, number: 7, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,depth,0,originIndex], bondCount: 1 });
			var molecule = new Molecule(atoms.filter(identity));					
			molecule.branchSolve(cb, depth+1);
			subcount++;
		}
		if( this.R2Groups().length ) {
			var atoms = this.atoms.slice();
			var R2Groups = this.R2Groups(),
				lengths = R2Groups.map(attr("atoms")).map(attr("length")),
				R2Group = R2Groups[lengths.indexOf(Math.max.apply({}, lengths))];

			R2Group.atoms.forEach(function(RMember) {
				var index = atoms.indexOf(RMember);				
				delete atoms[index];
			});
			
			var origin = R2Group.R2Neutralizable(),
				originIndex = R2Group.atoms.map(attr("name")).indexOf(origin),
				nonOrigins = R2Group.atoms.filter(function(_,i){return i!=originIndex});
							
			atoms.push({ name: "R2|"+depth, number: 6, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,depth,0,originIndex], bondCount: 2 });
			var molecule = new Molecule(atoms.filter(identity));
			
			molecule.branchSolve(cb, depth+1);
			subcount++;
		}
		if( this.R3Groups().length ) {
			var atoms = this.atoms.slice();
			var R3Groups = this.R3Groups(),
				lengths = R3Groups.map(attr("atoms")).map(attr("length")),
				R3Group = R3Groups[lengths.indexOf(Math.max.apply({}, lengths))];
				
			R3Group.atoms.forEach(function(RMember) {
				var index = atoms.indexOf(RMember);				
				delete atoms[index];
			});
			
			var origin = R3Group.R3Neutralizable(),
				originIndex = R3Group.atoms.map(attr("name")).indexOf(origin),
				nonOrigins = R3Group.atoms.filter(function(_,i){return i!=originIndex});
			
			atoms.push({ name: "R3|"+depth, number: 5, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,depth,0,originIndex], bondCount: 3 });
			var molecule = new Molecule(atoms.filter(identity));
			
			molecule.branchSolve(cb, depth+1);
		}
	}
};

var Tree = function(bonds) {
	this.bonds = bonds.map(function(bond) {
		return bond.from ? bond : {
			from: bond[0],
			to: bond[1],
			bonds: bond[2]
		};
	}).sort(function(a, b) {
		return a.from.match(/C/)?(b.from.match(/C/)?false:true):false;
	});		
};
Tree.prototype = {
	nextDirection: function(directions) {
		directions = directions.slice().reverse();
		var next = {
			'1,0': [0, 1],
			'0,1': [-1, 0],
			'-1,0': [0, -1],
			'0,-1': [1, 0]
		};
		for( var k in directions ) {
			var direction = directions[k];
			if( directions.indexOf(next[direction]) == -1 ) return next[direction];
		}
		return [0,0];
	},	
	inverseDirection: function(direction) {
		var inverse = {
			'1,0': [-1, 0],
			'0,1': [0, -1],
			'-1,0': [1, 0],
			'0,-1': [0, 1]
		};
		return inverse[direction+""];
	},
	coordinateTaken: function(coordinates, coordinate) {
		for( var k in coordinates ) {
			if( flatEqual(coordinates[k], coordinate) ) return true;
		}
		return false;
	},
	coordinates: function(coordinates, haveAssignedOrigin, directions) {
		var tree = this;
		var directions = directions || {},
			coordinates = coordinates || {},
			haveAssignedOrigin = haveAssignedOrigin || false,
			unknowns = [];
			
		this.bonds.forEach(function(branch) {			
			if( !coordinates[branch.from] && coordinates[branch.to] ) {
				var to = branch.from;
				branch.from = branch.to;
				branch.to = to;
			} else if( !coordinates[branch.from] && !haveAssignedOrigin ) {
				coordinates[branch.from] = [0,0];
				haveAssignedOrigin = true;
			} else if( !coordinates[branch.from] ) {
				unknowns.push(branch);
				return;
			}	
						
			directions[branch.from] = directions[branch.from] || [[0,-1]];	
			directions[branch.to] = directions[branch.to] || [];					
					
			var direction = tree.nextDirection(directions[branch.from]);
			directions[branch.from].push(direction);			
			directions[branch.to].push(tree.inverseDirection(direction));
			var shiftCoords = coordinates[branch.from].map(function(from,i){return from+direction[i]});
			for( var i = 0; i < 10; i++ ) {
				if( tree.coordinateTaken(coordinates, shiftCoords) ) {
					shiftCoords = shiftCoords.map(function(from,i){return from+[1,1][i]});
				} else {
					coordinates[branch.to] = shiftCoords;
					break;
				}
			}			
		});
		
		if( unknowns.length ) {				
			var tree = new Tree(unknowns);
			var add = tree.coordinates(coordinates, haveAssignedOrigin, directions);
			for( var k in add ) {
				coordinates[k] = add[k];
			}
		}
		
		return coordinates;
	},
	bondLines: function() {
		var coords = this.coordinates();
		return this.bonds.map(function(bond) {
			return { from: coords[bond.from], to: coords[bond.to], bonds: bond.bonds };
		});
	},
	context: {
		points: [],
		moveTo: function(ctx, x,y, shift) { 
			ctx.moveTo(30*(x+7),30*(y+5)+shift*2); 
			this.currentLineStart = [x,y]; 
		},
		lineTo: function(ctx, x,y, shift) {
			ctx.lineTo(30*(x+7),30*(y+5)+shift*2);
			this.points.push({ type: "line", points: [this.currentLineStart, [x,y]] });
		},
		arc: function(ctx, x,y,r,a1,a2) { 
			ctx.arc(30*(x+7),30*(y+5),r,a1,a2);
			this.points.push({ type: "circle", points: [x,y] }); 
		}
	},
	draw: function(ctx) {
		var tree = this;
		this.context.points = [];		
		
		this.bondLines().forEach(function(bond) {
			ctx.beginPath();		
			ctx.strokeStyle = 'black';
			if( bond.CtoC ) ctx.strokeStyle = 'blue';
			
			if( bond.bonds == '2' ) {
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], 1);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], 1);
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], -1);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], -1);
			} else if( bond.bonds == '3' ) {
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], 1.5);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], 1.5);
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], -1.5);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], -1.5);
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], 0);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], 0);
			} else {
				tree.context.moveTo(ctx, bond.from[0], bond.from[1], 0);
				tree.context.lineTo(ctx, bond.to[0], bond.to[1], 0);
			}
			
			ctx.stroke();
		});
		var coordinates = this.coordinates();
		for(var k in coordinates) {
			var xy = coordinates[k];
			ctx.beginPath();
			if( k.match(/C/) ) ctx.fillStyle = 'red';
			else { ctx.fillStyle = 'black'; }
			
			tree.context.arc(ctx, xy[0], xy[1], 10, 0, 2*Math.PI);
			
			ctx.fill();
		}
		return this.context.points;
	}
};


// Export if used as a Node.js module
try { 
	document; 
} catch(err) { 
	exports.Atom = Atom;
	exports.Molecule = Molecule;
	exports.Tree = Tree;
	exports.utils = {
		permutations: permutations,
		combinations: combinations,
		flatEqual: flatEqual,
		crossProduct: crossProduct,
		concat: concat,
		reducer: reducer,
		attr: attr,
		mapper: mapper,
		listConstituents: listConstituents
	};
}