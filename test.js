var util = require(__dirname + '/src/util.js'),
  Atom = needs("Atom"),
  Context = needs("Context"),
  PolyatomicIon = needs("PolyatomicIon"),
  Molecule = needs("Molecule"),
  Tree = needs("Tree"),
  Formula = needs("Formula"),
  Ion = needs("Ion");
  
var Timer = function() {
  var startTime;
  this.start = function() {
    startTime = new Date().getTime();
  };
  this.end = function() {
    return new Date().getTime() - startTime;
  };
};
var timer = new Timer(), verbose = false;
process.on('exit', function() { console.log("\nAll tests passed. Finishing."); });
var assert = function(assertion, fn, verbose) {
  timer.start();
  var resp = fn();
  if( resp !== true ) {
    throw new Error("\x1B[31mFailed\x1B[39m `"+assertion+"`!", JSON.stringify(resp));
  } else {
    if( verbose ) console.log("\x1B[32mPassed\x1B[39m `"+assertion+"` in "+timer.end()+" ms.");
    process.stdout.write(".");
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
  
    var hs = permutations(h, 2),
      os = permutations(o, 2);
      
    // take crossProduct and flatten result
    var cross = crossProduct(hs, os).reduce(concat).map(reducer(concat));
    return flatEqual(cross.map(mapper(attr("number"))), [[6,6],[6,6,7],[6,6,7,7],[6],[6,7],[6,7,7],[],[7],[7,7]]);
  });
  
  assert("Combining of multiple repeat elements", function() {
    var h = new Atom("H", 7),
      o = new Atom("O", 6);
  
    // map to permutations and reduce with combinations
    var permute = [[h,2], [o, 2]].map(permutations.apply.bind(permutations, {})).reduce(combinations);
    return flatEqual(permute.map(mapper(attr("number"))), [[6,6],[6,6,7],[6,6,7,7],[6],[6,7],[6,7,7],[],[7],[7,7]]);
  });
  
  assert("Molecule summary", function() {
    var h = new Atom("H", 7),
      o = new Atom("O", 6);
  
    var molecule = new Molecule([h, h, o]);
    return flatEqual(listConstituents(molecule.atoms).map(attr(1)), [2, 1]);
  });
  
  assert("Sub-molecules", function() {
    var h = new Atom("H", 7),
      o = new Atom("O", 6);
  
    var molecule = new Molecule([h, h, o, o]);
    return flatEqual(molecule.subMolecules().map(chain(mapper(attr("number")), attr("atoms"))), [[6,6],[6,6,7],[6,6,7,7],[6,7],[6,7,7],[7,7]]);
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
    
    return flatEqual(molecule.R2Groups().map(function(group){ return group.R2Neutralizable(); }), ["R","C"]);
  });
  
  assert("Branch solving of molecule", function() {
    var c = new Atom("C", 4),
      h = new Atom("H", 7);
  
    var molecule = new Molecule([c,c,h,h,h,h]);
    
    var solve;
    molecule.branchSolve(function(solution) {
      solve = solution;
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
    molecule.branchSolve(function(solution) {
      solve = solution;
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
  
  assert("Organic chemistry isomers", function() {
    var c = new Atom("C", 4),
      h = new Atom("H", 7);
  
    var molecule = new Molecule([c,c,c,c,h,h,h,h]);
    var solves = [],
      i = 0;
    molecule.solve(function(solution) {
      solves.push(solution.bonds);
    }, false);  
    return solves.map(function(solve) {
      return solve.filter(function(bond) {
        return bond[0][0] == 'H' || bond[1][0] == 'H';
      }).length;
    }).filter(isEqual(4)).length == 6;
  });
  
  assert("Plotting of bonds and atoms", function() {
    var c = new Atom("C", 4),
      h = new Atom("H", 7);
  
    var molecule = new Molecule([c,c,h,h,h,h]);
    
    var solve;
    molecule.solve(function(solution) {
      solve = solution;
    });
    
    var tree = new Tree(solve);
    var coords = tree.coordinates();
    
    var elemOfCoord = function(coord) {
      for( var k in coords ) if( flatEqual(coord, coords[k]) ) return k;
      return "";
    };
    
    var shapes = tree.draw(new Context()),
      bonds = [];      
    shapes.forEach(function(shape) {
      if( shape.type == "line" ) { bonds.push(shape.points.map(elemOfCoord)); }
    });

    // make sure all bonds drawn are as calculated
    return solve.bonds.filter(function(bond) {
      return bonds.filter(function(drawnBond) {
        return (drawnBond[0] == bond[0] && drawnBond[1] == bond[1]) || (drawnBond[0] == bond[1] && drawnBond[1] == bond[0]);
      }).length == 0;
    }).length == 0;
  });
  
  assert("Build a molecule from formula", function() {
    var atoms = new Formula("C6H12O6").atoms();
    
    var cs = atoms.map(attr("name")).filter(isEqual("C")),
      hs = atoms.map(attr("name")).filter(isEqual("H")),
      os = atoms.map(attr("name")).filter(isEqual("O"));
    return cs.length == 6 && hs.length == 12 && os.length == 6;
  });
  
  assert("Circular solving of molecule", function() {
    var o = new Atom("O", 6);
  
    var molecule = new Molecule([o,o,o]);
    
    var solve;
    molecule.circularSolve(function(solution) {
      solve = solution;
    });
    
    var oo = solve.filter(function(bond) {
      return (bond[0][0] == 'O' && bond[1][0] == 'O');
    });
    
    return oo.length == 3;
  });
  
  assert("Drawing of 'circles' in a way that it is clear", function() {
    var formula = new Formula("C4O12");
    var molecule = new Molecule(formula.atoms());

    var tree, coords;
    molecule.solve(function(solution) {
      tree = new Tree(solution);
      coords = tree.coordinates();
    });

    var start = coords[molecule.endpoints.start[1]], 
      end = coords[molecule.endpoints.end[1]];    

    return start[0] != end[0] && start[1] != end[1];
  });
  
  assert("Ionic bonds", function() {
    var formula = new Formula("NaCl");
    var molecule = new Molecule(formula.atoms());
    
    var solve;
    molecule.solve(function(solution) {
      solve = solution.bonds;
    });
    
    return solve.length == 1 && solve[0][2] == "1";
  });
  
  assert("Polyatomic Cation", function() {
    var formula = new Formula("NH4");
    var molecule = new Molecule(formula.atoms());
    
    var solve;
    molecule.solve(function(solution) {
      solve = solution.bonds;
    });
    
    return solve.filter(function(bond) {
      return bond[1].match(/^N/);
    })[0][1].match(/\+[0-9]/)[0] == "+1";
  });
  
  assert("Polyatomic Anion", function() {
    var formula = new Formula("CO");
    var molecule = new Molecule(formula.atoms());
    
    var solve;
    molecule.solve(function(solution) {
      solve = solution.bonds;
    });
    
    return solve.filter(function(bond) {
      return bond[1].match(/^C/);
    })[0][1].match(/_[0-9]/)[0] == "_2";
  });
})();
