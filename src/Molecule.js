var Atom = needs("Atom"),
  PolyatomicIon = needs("PolyatomicIon"),
  Ion = needs("Ion");
var solved = false;
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
        
        // If ionic bond, give charge equal to bond count
        if( center.match(/\+([0-9])/) ) {
          atom.subMolCenter = new Ion(atom.subMolCenter).addCharge("_"+atom.bondCount);
        } else if( atom.subMolCenter.match(/_([0-9])/) ) {
          center = new Ion(center).addCharge("+"+atom.bondCount);
        }
        return atom.subMol.output(atom.subMolCenter, subMolCount)+";"+atom.subMolCenter+"-"+center+"-"+atom.bondCount;
      }
      
      // If ionic bond, give charge equal to bond count
      if( new Atom().parseName(center).charge && !atom.charge ) {
        atom.charge = atom.number-8;
      } else if( atom.charge && new Atom().parseName(center).charge ) {
        var number = center.match(/#[0-9]/)[0].substr(1);
        center = new Ion(center).addCharge("_"+(8-number));
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
          
      // Don't allow circles to be formed with a single element      
      if( bonds[start.index][0] == bonds[start.index][1] ) {
        return;
      }            
      
      cb(bonds);
    });
  },
  solve: function(cb, firstOnly) {
    // Try to solve the molecule linearly, if that fails,...
    // ... try to solve circularly. Don't count as a solution...
    // ... a bond list including an `RGroup`.
    var bondsAreUnique = function(bonds) {  
      // Don't allow duplicate bonds to be made.    
      var unique = {}, resp = true;
      bonds.forEach(function(bond) {
        if( unique[bond[0]+","+bond[1]] || unique[bond[1]+","+bond[0]] ) resp = false;
        unique[bond[0]+","+bond[1]] = true;
        unique[bond[1]+","+bond[0]] = true;
      });
      return resp;
    };
    var solves = [];
    this.branchSolve(function(solution) {      
      if( solution.join("").indexOf("R") != -1 ) return;
      cb({
        method: "branch",
        bonds: solution
      });
      solves.push(solution);
    }, firstOnly);
    
    if( (!solves.length) && this.atoms.length > 2 ) {
      var solve;
      this.circularSolve(function(solution) {        
        solve = solution;
        solves.push(solution);
      });      
      if( solve && bondsAreUnique(solve) ) {
        cb({
          method: "circle",
          bonds: solve,
          endpoints: this.endpoints
        });
      }
    }
    
    if( !solves.length || firstOnly === false ) {      
      // Cycle through charge counts to make polyatomic ions by...
      // ... inclusion of either bare electrons or `funnels` and...
      // ... later removal of them.
      for( var i = 1; i <= 4; i++ ) {      
        var electrons = range(i).map(constant(new Atom("e_1", 7)));
        var mol = new Molecule(this.atoms.concat(electrons));
        mol.branchSolve(function(solution) {
          if( solution.join("").indexOf("R") != -1 ) return;        
          
          solution = new PolyatomicIon(solution).applyCharges(/e_/);
          
          cb({
            method: "polyatomic (-"+i+")",
            bonds: solution
          });
          solves.push(solution);
        });
        
        if( solves.length && firstOnly !== false ) break;
        
        var protons = range(i).map(constant(new Atom("e+1", 5)));
        var mol = new Molecule(this.atoms.concat(protons));
        mol.branchSolve(function(solution) {          
          if( solution.join("").indexOf("R") != -1 ) return;        
          
          solution = new PolyatomicIon(solution).skipFunnels(/e+/, "+1");
          
          cb({
            method: "polyatomic (+"+i+")",
            bonds: solution
          });
          solves.push(solution);
        });
        
        if( solves.length && firstOnly !== false ) break;
      }
    }    
  }
};
try {
  module.exports = Molecule;
} catch(err) {}

