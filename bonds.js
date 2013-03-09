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
var isEqual = function(a) { return function(b) { return a==b; } };

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
var getLevel = function(center) { return center.match(/[0-9]+/) ? center.match(/[0-9]+/g)[1] : ""; };

// Classes
var solved = false;
var Context = function() {
	// useless class used that allows tests to be run...
	// ... without a canvas element
	var context = this;
	var fns = ["moveTo", "lineTo", "arc", "beginPath", "closePath", "stroke", "fill", "fillText"];
	fns.forEach(function(fn) {
		context[fn] = function(){};
	});
};
var Atom = function(label, ve, charge) {
	this.charge = charge || 0;
	this.name = label+(charge?(charge>0?"+"+charge:"_"+Math.abs(charge)):"");
	this.element = label;
	this.number = ve;	
};
Atom.prototype = {
	renderCharge: function() {
		var prefix = this.charge > 0 ? String.fromCharCode(0x207A) : String.fromCharCode(0x207B),
			number = this.charge > 0 ? this.charge : -1*this.charge;
		var superscripts = [0, 0xb9, 0xb2, 0xb3].map(function(code) {
			return code ? prefix+String.fromCharCode(code) : "";
		});
		return superscripts[number];
	},
	parseName: function(name) {
		var superscripts = [0, 0xb9, 0xb2, 0xb3].map(function(code) {
			return code ? String.fromCharCode(0x207A)+String.fromCharCode(code) : "";
		});
		var chargeMatch = name.match(/[+_][0-9]/);
		var element = name.match(/^[a-zA-Z]+/)[0],
			number = name.match(/#[0-9]/)[0].substr(1)-0,
			chargeNum = chargeMatch ? parseInt(chargeMatch[0][1]) : 0,
			charge = chargeMatch ? chargeMatch[0][0]=="_"?-1*chargeNum:chargeNum : 0;

		return new Atom(element, number, charge);
	},
	renderInfo: function(centerLevel, subMolIndex, atomIndex) {
		var charge = this.charge > 0 ? "+"+this.charge : "_"+Math.abs(this.charge);
		return this.element+charge+",#"+this.number+","+centerLevel+","+subMolIndex+","+atomIndex;
	}
};
var Molecule = function(atoms) {
	this.atoms = atoms;
};
Molecule.prototype = {
	output: function(center, subMolIndex) {
		// Recursively generates a list of the form:
		/*
			H,#7,0,0,0-C,#4,0,0,1-1;H,#7,0,0,2-C,#4,0,0,3-1;
		*/
		// Then splits at `;` and splits at `-` to bear a...
		// ... two-dimensional array.
		subMolIndex = subMolIndex || 0;
		var subMolCount = 0;
		return this.atoms.map(function(atom, index) {
			if( atom.subMol ) {				
				subMolCount++;
				if( !center ) {
					return atom.subMol.output(atom.subMolCenter, subMolCount);
				}
				return atom.subMol.output(atom.subMolCenter, subMolCount)+";"+atom.subMolCenter+"-"+center+"-"+atom.bondCount;
			}
			if( new Atom().parseName(center).charge ) {
				atom.charge = atom.number-8;
			} else if( atom.charge ) {
				center = center.replace(/^([A-Za-z]+)/, "$1_"+(8-atom.number));
			}		
			return atom.renderInfo(getLevel(center), subMolIndex, index)+"-"+center+"-"+(8-atom.number);
		}).join(";");
	},
	isOrigin: function(atom) {
		// Checks whether a given atom can have all others connected...
		// ... to it, the foundation of solving molecules.
		var index = this.atoms.indexOf(atom);
		return (8-atom.number) == this.atoms
					.filter(function(_,i){return i!=index})
					.map(attr("number"))
					.map(multiply.bind({}, -1))
					.map(add.bind({}, 8))
					.reduce(add, 0);
	},
	hasOrigin: function() {
		// Checks which of a molecules atoms can serve as an `origin`.
		return this.atoms.filter(this.isOrigin.bind(this)).map(attr("name"))[0]
	},
	subMolecules: function() {
		// Gets every subset of a molecule that later it can be checked which...
		// ... subsets should be isolated out and treated like sub-molecules...
		// ... throughout this class referred to as `RGroups`.
		var permute = listConstituents(this.atoms).map(permutations.apply.bind(permutations, {}));
		return permute.reduce(combinations).filter(function(atoms){return atoms.length>1}).map(function(atoms){return new Molecule(atoms)});
	},
	R1Neutralizable: function() {
		// Assess whether sub-molecule can connect to the rest of the molecule...
		// ... by a single bond.
		var withR1 = new Molecule(this.atoms.concat(new Atom("R", 7)));
		return withR1.hasOrigin();
	},
	R2Neutralizable: function() {
		// Assess whether sub-molecule can connect to the rest of the molecule...
		// ... by two bonds.
		var withR2 = new Molecule(this.atoms.concat(new Atom("R", 6)));
		return withR2.hasOrigin();
	},
	R3Neutralizable: function() {
		// Assess whether sub-molecule can connect to the rest of the molecule...
		// ... by three bonds.
		var withR3 = new Molecule(this.atoms.concat(new Atom("R", 5)));
		return withR3.hasOrigin();
	},
	R1Groups: function() {
		// Find sub-molecules that can connect to the rest of the molecule...
		// ... by a single bond.
		return this.subMolecules().filter(function(mol) { return mol.R1Neutralizable(); });
	},
	R2Groups: function() {
		// Find sub-molecules that can connect to the rest of the molecule...
		// ... by two bonds.
		return this.subMolecules().filter(function(mol) { return mol.R2Neutralizable(); });
	},
	R3Groups: function() {
		// Find sub-molecules that can connect to the rest of the molecule...
		// ... by three bonds.
		return this.subMolecules().filter(function(mol) { return mol.R3Neutralizable(); });
	},
	branchSolve: function(cb, firstOnly, depth) {
		// Solve a molecule by recursively branching in which sub-molecules...
		// ... are separated from the rest of the molecule, until the entire...
		// ... can be centered on a single atom, the `origin`.
		var subcount = 0;
		if( depth == undefined ) { solved = false; }
		depth = depth || 0;
		firstOnly = firstOnly === false ? false : true;
		if( solved ) { return; }
		if( this.hasOrigin() ) {	
			var originIndex = this.atoms.map(attr("name")).indexOf(this.hasOrigin());			
			var molecule = new Molecule(this.atoms.filter(function(_,i){ return i!=originIndex; }));
			/*cb(molecule.output(""+[this.hasOrigin(),"#"+this.atoms[originIndex].number,depth,originIndex]).split(';').map(function(pair) {
				return pair.split('-');
			})); */
			cb(new Molecule([{
				name: "mol", number: 8, subMol: molecule, subMolCenter: ""+[this.hasOrigin(),"#"+this.atoms[originIndex].number,depth,originIndex], bondCount: 0
			}]).output().split(';').map(function(pair) {
				return pair.split('-');
			}));
			if(firstOnly) solved = true;
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
				nonOrigins = R1Group.atoms.filter(function(_,i){return i!=originIndex}),
				number = '#'+R1Group.atoms[originIndex].number;

			atoms.push({ name: "R1", number: 7, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,number,depth,0,originIndex], bondCount: 1 });
			var molecule = new Molecule(atoms.filter(identity));					
			molecule.branchSolve(cb, firstOnly, depth+1);
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
				nonOrigins = R2Group.atoms.filter(function(_,i){return i!=originIndex}),
				number = '#'+(originIndex==-1?7:R2Group.atoms[originIndex].number);
							
			atoms.push({ name: "R2", number: 6, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,number,depth,0,originIndex], bondCount: 2 });
			var molecule = new Molecule(atoms.filter(identity));
			
			molecule.branchSolve(cb, firstOnly, depth+1);
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
				nonOrigins = R3Group.atoms.filter(function(_,i){return i!=originIndex}),
				number = '#'+(originIndex==-1?7:R3Group.atoms[originIndex].number);
			
			atoms.push({ name: "R3", number: 5, subMol: new Molecule(nonOrigins), subMolCenter: ""+[origin,number,depth,0,originIndex], bondCount: 3 });
			var molecule = new Molecule(atoms.filter(identity));
			
			molecule.branchSolve(cb, firstOnly, depth+1);
		}
	},
	circularSolve: function(cb) {
		// Connect a start and end atom to the molecule and then solve, afterwards...
		// ... replacing the start and end node with a single bond. Creating a circle.
		var self = this;
		var molecule = new Molecule(this.atoms.concat(new Atom("St", 7)).concat(new Atom("En", 7)));			
		molecule.branchSolve(function(bonds) {
			var start = bonds.map(function(elm, index) {
					return { atom: elm, index: index };
				}).filter(function(bond) { return bond.atom[0].match(/St/) || bond.atom[1].match(/St/) })[0],
				end = bonds.map(function(elm, index) {
					return { atom: elm, index: index };
				}).filter(function(bond) { return bond.atom[0].match(/En/) || bond.atom[1].match(/En/) })[0];	
			
			self.endpoints = {
				start: start.atom,
				end: end.atom
			};	
			
			if( start.atom && end.atom ) {
				if( start.atom[0].match(/St/) ) {
					if( end.atom[0].match(/En/) ) bonds[start.index] = [start.atom[1], end.atom[1], start.atom[2]];
					else { bonds[start.index] = [start.atom[1], end.atom[0], start.atom[2]]; }
				} else {
					if( end.atom[0].match(/En/) ) bonds[start.index] = [start.atom[0], end.atom[1], start.atom[2]];
					else { bonds[start.index] = [start.atom[0], end.atom[0], start.atom[2]]; }
				}
				delete bonds[end.index];
			}			
			cb(bonds);
		});
	},
	solve: function(cb, firstOnly) {
		// Try to solve the molecule linearly, if that fails,...
		// ... try to solve circularly. Don't count as a solution...
		// ... a bond list including an `RGroup`.
		var solves = [];
		this.branchSolve(function(solution) {
			if( solution.join("").indexOf("R") != -1 ) return;
			cb({
				method: "branch",
				bonds: solution
			});
			solves.push(solution);
		}, firstOnly);
		if( !solves.length ) {
			var solve;
			this.circularSolve(function(solution) {
				solve = solution;
			});
			cb({
				method: "circle",
				bonds: solve,
				endpoints: this.endpoints
			});
		}
	}
};

var Tree = function(solution) {
	this.bonds = solution.bonds.map(function(bond) {
		return bond.from ? bond : {
			from: bond[0],
			to: bond[1],
			bonds: bond[2]
		};
	});	
	this.endpoints = solution.endpoints || { start: "", end: "" };
};
Tree.prototype = {
	nextDirection: function(directions, preference) {
		// After making a bond, decide in what direction the next bond...
		// ... should be made.
		directions = directions.slice().reverse();
		var next = {
			'1,0': [0, 1],
			'0,1': [-1, 0],
			'-1,0': [0, -1],
			'0,-1': [1, 0]
		};
		
		// Allow a preferred direction to be taken, useful in making organic...
		// ... look as they are usually seen, i.e., in making C-C bonds...
		// ... horizontal.
		if( preference && directions.indexOf(preference) == -1 ) return preference;
		
		for( var k in directions ) {
			var direction = directions[k];
			if( directions.indexOf(next[direction]) == -1 ) return next[direction];
		}
		return [0,0];
	},	
	inverseDirection: function(direction) {
		// After making a bond to another atom, decide in which direction...
		// ... it should start in making its own bonds.
		var inverse = {
			'1,0': [-1, 0],
			'0,1': [0, -1],
			'-1,0': [1, 0],
			'0,-1': [0, 1]
		};
		return inverse[direction+""];
	},
	coordinateTaken: function(coordinates, coordinate) {
		// Avoid placing two atoms in the exact same spot.
		for( var k in coordinates ) {
			if( flatEqual(coordinates[k], coordinate) ) return true;
		}
		return false;
	},
	coordinates: function(coordinates, haveAssignedOrigin, directions) {
		// Decide coordinates for all atoms based on a single initial...
		// ... position and relative position derived from bonds. To...
		// ... combat the issue of an atom's `dependencies` coming after...
		// ... it we recurse if any are not yet placed.
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
				
			// For bonds between the same element (e.g., C=C) try to go straight out
			var preferredDirection;
			if( branch.from.match(/^[A-Za-z]+/)[0] == branch.to.match(/^[A-Za-z]+/)[0] ) {
				preferredDirection = [1,0];
			}
			
			// For bonds at a start point, try to go the opposite direction of the end point
			if( branch.from == tree.endpoints.start[1] || branch.to == tree.endpoints.start[1] ) {
				preferredDirection = [0,1];
			} else if( branch.from == tree.endpoints.end[1] || branch.to == tree.endpoints.end[1] ) {
				preferredDirection = [0,-1];
			}
			
			// Place the new atom in a given direction relative to the atom to...
			// ... which it is bonded.
			var direction = tree.nextDirection(directions[branch.from], preferredDirection);			
			directions[branch.from].push(direction);
			directions[branch.to].push(tree.inverseDirection(direction));						
			var shiftCoords = coordinates[branch.from].map(function(from,i){return from+direction[i]});
			
			// Change direction or move outward until the proposed location of...
			// ... the new atom is not already occupied. This serves as a sort of...
			// ... fallback plan to avoid overlaps at all costs.
			while( true ) {
				if( tree.coordinateTaken(coordinates, shiftCoords) && directions.length == 4 ) {
					shiftCoords = shiftCoords.map(function(from,i){return from+[1,1][i]});
				} else if( tree.coordinateTaken(coordinates, shiftCoords) ) {
					direction = tree.nextDirection(directions[branch.from]);
					directions[branch.from].push(direction);
					directions[branch.to].push(tree.inverseDirection(direction));
					shiftCoords = coordinates[branch.from].map(function(from,i){return from+direction[i]});
				} else {
					coordinates[branch.to] = shiftCoords;					
					break;
				}
			}			
		});
		
		if( unknowns.length ) {				
			var tree = new Tree({ method: "recurse", endpoints: tree.endpoints, bonds: unknowns});
			var add = tree.coordinates(coordinates, haveAssignedOrigin, directions);
			for( var k in add ) {
				coordinates[k] = add[k];
			}
		}
		
		return coordinates;
	},
	bondLines: function() {
		// Map bonds between elements to bonds between coordinates.
		var coords = this.coordinates();
		return this.bonds.map(function(bond) {
			return { from: coords[bond.from], to: coords[bond.to], bonds: bond.bonds };
		});
	},
	context: {
		// A set of functions for dealing with a canvas context that handle...
		// ... scaling and recording of points for testing.
		points: [],
		line: function(ctx, p1, p2, shift) {
			var size = this.window.size, 
				xOffset = this.window.xOffset,
				yOffset = this.window.yOffset;
			var x1 = p1[0], x2 = p2[0], y1 = p1[1], y2 = p2[1];
			ctx.lineWidth = size/15;
			if( x1 == x2 ) {
				ctx.moveTo(size*(x1+xOffset)+shift*size/15, size*(y1+yOffset)); 
				ctx.lineTo(size*(x2+xOffset)+shift*size/15, size*(y2+yOffset));
			} else {
				ctx.moveTo(size*(x1+xOffset), size*(y1+yOffset)+shift*size/15); 
				ctx.lineTo(size*(x2+xOffset), size*(y2+yOffset)+shift*size/15);				
			}
			this.points.push({ type: "line", points: [p1, p2] });
		},
		arc: function(ctx, x,y) { 
			var size = this.window.size,
				xOff = this.window.xOffset,
				yOff = this.window.yOffset;
			ctx.arc(size*(x+xOff),size*(y+yOff),size/3,0,Math.PI*2);
			this.points.push({ type: "circle", points: [x,y] }); 
		},
		fillText: function(ctx, txt, x,y) {
			var size = this.window.size;
			ctx.font = "bold "+Math.floor(size/4)+"px Arial";
			ctx.fillText(txt, this.window.size*(x+this.window.xOffset)-size/4,this.window.size*(y+this.window.yOffset)+size/8);
		}
	},
	window: function() {
		// Decide scale and position at which to draw the molecule.
		var coords = [], treeCoords = this.coordinates();
		for( var k in treeCoords ) coords.push(treeCoords[k]);
		
		var xRange = {
			from: Math.min.apply({}, coords.map(attr(0))),
			to: Math.max.apply({}, coords.map(attr(0)))
		};
		var yRange = {
			from: Math.min.apply({}, coords.map(attr(1))),
			to: Math.max.apply({}, coords.map(attr(1)))
		};
		return {
			size: 600/(Math.max(xRange.to-xRange.from, yRange.to-yRange.from)+2),
			xOffset: -1 * (xRange.from-1),
			yOffset: -1 * (yRange.from-1)
		};
	},
	draw: function(ctx) {
		// Draw the molecule's atoms and bonds.
		var tree = this;
		this.context.points = [];	
		this.context.window = this.window();	
		
		// Render the bonds between atoms.
		this.bondLines().forEach(function(bond) {
			ctx.beginPath();		
			ctx.strokeStyle = 'black';
			if( bond.CtoC ) ctx.strokeStyle = 'blue';						
			
			if( bond.bonds == '2' ) {
				tree.context.line(ctx, bond.from, bond.to, 1);
				tree.context.line(ctx, bond.from, bond.to, -1);
			} else if( bond.bonds == '3' ) {
				tree.context.line(ctx, bond.from, bond.to, 1.5);
				tree.context.line(ctx, bond.from, bond.to, 0);
				tree.context.line(ctx, bond.from, bond.to, -1.5);
			} else {
				tree.context.line(ctx, bond.from, bond.to, 0);
			}
			
			ctx.stroke();
		});
		
		// Render the atoms whose bonds we have already drawn.
		var coordinates = this.coordinates();		
		for(var k in coordinates) {
			var xy = coordinates[k];
			var atom = new Atom().parseName(k),
				element = atom.element,
				number = atom.number,
				charge = atom.renderCharge();
			console.log(atom, charge);
			ctx.beginPath();
			ctx.fillStyle = ["#0f0", "#f00", "#00f", "#666"][7-number];
			
			tree.context.arc(ctx, xy[0], xy[1]);			
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.stroke();
						
			ctx.fillStyle = '#000';						
			tree.context.fillText(ctx, element+charge, xy[0], xy[1]);			
		}
		return this.context.points;
	}
};
var Formula = function(formula) {
	// Relate element name to valence electron number. Note that...
	// ... Hydrogen is considered to have 7 for convenience's sake.
	var elements = [["H", "He"],["Li", "Be", "B", "C", "N", "O", "F", "Ne"], ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"], ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"], ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"], ["Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"]];
	var ve = [
		[7,										  								8],
		[1,2,														  3,4,5,6,7,8],
		[1,2,														  3,4,5,6,7,8],
		[1,2, 								  2,2,2, 2,2,2, 2,2,2, 2, 3,4,5,6,7,8],
		[1,2, 								  2,2,2, 2,2,2, 2,2,2, 2, 3,4,5,6,7,8],
		[1,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 3,4,5,6,7,8]];
	
	var atoms = {};
	elements.forEach(function(row, i) {
		row.forEach(function(elm, j) {
			var number = ve[i][j];
			atoms[elm] = number >= 4 ? new Atom(elm, number) : new Atom(elm, 8-number, number);
		});
	});
	this.namedAtom = atoms;	
	this.formula = formula;	
};
Formula.prototype = {
	repeat: function(x, n) {
		return list(n).map(constant(x));
	},
	atoms: function() {
		// Match element names and subscripts and repeat elements...
		// ... based on their subscripts.
		var formula = this;
		var parts = this.formula.match(/[A-Z][a-z]?([0-9]+)?/g),
			atoms = parts.map(function(elm) {
				var nums = elm.match(/[0-9]+/),
					number = nums?parseInt(nums[0]):1;
				return formula.repeat(elm.match(/[A-Z][a-z]?/)[0], number);
			}).reduce(concat);
		return atoms.map(function(elm) { return formula.namedAtom[elm]; });
	}
};


// Export if used as a Node.js module
try { 
	document; 
} catch(err) { 
	exports.Atom = Atom;
	exports.Molecule = Molecule;
	exports.Tree = Tree;
	exports.Context = Context;
	exports.Formula = Formula;
	exports.utils = {
		permutations: permutations,
		combinations: combinations,
		flatEqual: flatEqual,
		crossProduct: crossProduct,
		concat: concat,
		reducer: reducer,
		attr: attr,
		mapper: mapper,
		listConstituents: listConstituents,
		chain: chain,
		isEqual: isEqual
	};
}