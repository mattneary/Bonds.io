(function(global) {
  // Utilities
  global.constant = function(x) { return function() { return x; }; };
  global.identity = function(x) { return x; };

  // functional forms of basic operators
  global.add = function(a, b) { return a+b; };
  global.concat = function(a, b) { return b.concat(a); };
  global.multiply = function(a, b) { return a*b; };
  global.attr = function(attr) { return function(elm) {return elm[attr]; } };
  global.call = function(attr) { return function(elm) {return elm(attr); } };

  // convenience functions to keep things clean
  global.chain = function(a, b) { return function(elm) {return a(b(elm))} };
  global.list = function(length) { return length?Array(length).join(0).split(0):[]; };
  global.range = function(length) { return list(length).map(function(_,n){return n;}); }
  global.unique = function(a,b) { return a.map?(a.indexOf(b)!=-1 ? a : a.concat(b)):(a==b?[a]:[a,b]) }
  global.arrayize = function(x) { return x.map ? x : [x]; };
  global.zip = function(a) { return function(b) { return [a,b] }; };
  global.isEqual = function(a) { return function(b) { return a==b; } };

  // two-dimensional array helpers
  global.mapper = function(fn) { return function(elm) { return elm.map(fn); }; };
  global.reducer = function(fn) { return function(elm) { return elm.reduce(fn); }; };

  // lazy implementation of object comparison
  global.flatEqual = function(a, b) { return JSON.stringify(a) == JSON.stringify(b); };

  // Functions used to make subgroups
  global.permutations = function(elm, count) { return range(count+1).map(range).map(mapper(constant(elm))); };
  global.crossProduct = function(a, b) { return b.map(chain(a.map(zip).map.bind(a.map(zip)), call)); };
  global.combinations = function(a, b) { return crossProduct(a, b).reduce(concat).map(reducer(concat)) };
  global.listConstituents = function(list) { 
    return arrayize(list.reduce(unique)).map(function(a){
      return [a, list.length - list.slice().reverse().indexOf(a) - list.indexOf(a)]; 
    });
  };

  // Atom name parser
  global.getLevel = function(center) { return center.match(/[0-9]+/) ? center.match(/[0-9]+/g)[1] : ""; };
  global.needs = function(f) {
    try {
      require;
    } catch(err) {
      return global[f];
    }
    return require(__dirname + '/' + f);
  };
}(function() {
  try {
    return window;
  } catch(err) {
    return global;
  }
}()));

