var Atom = needs("Atom"),
  Ion = needs("Ion");
var PolyatomicIon = function(bonds) {
  this.bonds = bonds;
};
PolyatomicIon.prototype = {
  applyCharges: function(connective) {
    var charged = [];
    var solution = this.bonds.filter(function(bond) {
      if( bond[0].match(connective) ) {
        charged.push(bond[1]);
        return false;
      }
      if( bond[1].match(connective) ) {
        charged.push(bond[0]);
        return false;
      }        
      return true;    
    });
    var implementedCharges = {};
    solution.forEach(function(bond) {
      if( charged.indexOf(bond[0]) != -1 ) {
        implementedCharges[bond[0]] = (parseInt(implementedCharges[bond[0]]||0) + parseInt(bond[2])) + "";
        return [new Ion(bond[0]).addCharge("_"+implementedCharges[bond[0]]), bond[1], bond[2]];
      }
      if( charged.indexOf(bond[1]) != -1 ) {
        implementedCharges[bond[1]] = (parseInt(implementedCharges[bond[1]]||0) + parseInt(bond[2])) + "";
        return [bond[0], new Ion(bond[1]).addCharge("_"+implementedCharges[bond[1]]), bond[2]];
      }
      return bond;
    });
    solution = solution.map(function(bond) {
      if( implementedCharges[bond[0]] ) {
        bond[0] = new Ion(bond[0]).addCharge("_"+(8 - new Atom().parseName(bond[0]).number - implementedCharges[bond[0]]));
      }
      if( implementedCharges[bond[1]] ) {
        bond[1] = new Ion(bond[1]).addCharge("_"+(8 - new Atom().parseName(bond[1]).number - implementedCharges[bond[1]]));
      }
      return bond;
    });

    return !solution.length ? [[charged[0], charged[0], 1]] : solution;
  },      
  skipFunnels: function(connective, charge) {
    var charged = {};
    var solution = this.bonds.filter(function(bond) {
      // NOTE: the choice of [1] is arbitrary, the point is...
      // ... to get only one half of the funnel. Fix this.
      if( bond[1].match(connective) ) {
        charged[bond[1]] = charged[bond[1]] || [];
        charged[bond[1]].push(bond[0]);
        return false;
      }      
      return true;    
    });
    var additions = [],
      chargedModified = [];
    solution = solution.map(function(bond) {
      if( bond[0].match(connective) ) {
        chargedModified.push(bond[1]);
        [].push.apply(additions, (charged[bond[0]] ? charged[bond[0]] : []).map(function(bond0) {
          return [new Ion(bond0).removeCharge(), bond[1], bond[2]];
        }));
        return false;            
      }
      return bond;
    }).filter(identity);            
    [].push.apply(solution, additions);
    solution = solution.map(function(bond) {
      if( chargedModified.indexOf(bond[0]) != -1 ) {
        bond[0] = new Ion(bond[0]).addCharge("+"+bond[2]);
      }
      if( chargedModified.indexOf(bond[1]) != -1 ) {
        bond[1] = new Ion(bond[1]).addCharge("+"+bond[2]);
      }
      return bond;
    });    

    return solution;
  }
};
try {
module.exports = PolyatomicIon;
} catch(err) {}

