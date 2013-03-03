Introduction
============
Bonds.io is a website that draws bond diagrams of provided molecules. I recently rewrote the algorithm to be much more maintainable, thus this version has not yet been published to the webpage.

Usage
=====
Include `bonds.js`, make a new `Molecule` constituent of `Atoms`, call `Molecule#branchSolve` and make a `Tree` of that solution. Then call `Tree#draw`. For example

		var c = new Atom("C", 4),
			h = new Atom("H", 7);
	
		var molecule = new Molecule([c,h,h,h,h]);
		
		var solve;
		molecule.branchSolve(function(summary) {
			solve = summary;
		});
		
		var tree = new Tree(solve);
		tree.draw();