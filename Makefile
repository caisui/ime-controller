FILES=makefile bootstrap.js install.rdf

xpi:
	7z u -tzip ime-manager.xpi -xr!*.swp $(FILES)
