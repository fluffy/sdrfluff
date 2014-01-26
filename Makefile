
all: cert.pem testDsp dsp.js 

serv:
	node node-serv.js 4443 


cert.pem: openssl.cnf
	openssl req -x509 -newkey rsa:2048 -keyout privkey.pem -out cert.pem -days 30 -nodes -config openssl.cnf


testDsp: testDsp.cpp dsp.cpp dsp.h
	g++ -o testDsp testDsp.cpp dsp.cpp


dsp.js: dsp.cpp
	em++ -O2 dsp.cpp -o dsp.js -s EXPORTED_FUNCTIONS="['_soundProcess','_hammingEncode','_hammingDecode']"


pretty:
	js-beautify --jslint-happy guiSend.js >  guiSend.js.pretty
	mv guiSend.js.pretty guiSend.js
	js-beautify --jslint-happy guiRecv.js >  guiRecv.js.pretty
	mv guiRecv.js.pretty guiRecv.js
	js-beautify --jslint-happy gui.js >  gui.js.pretty
	mv gui.js.pretty gui.js
	js-beautify --jslint-happy node-serv.js >  node-serv.js.pretty
	mv node-serv.js.pretty node-serv.js
	js-beautify --jslint-happy sdrFluff.js > sdrFluff.js.pretty
	mv sdrFluff.js.pretty sdrFluff.js
	astyle --style=allman < dsp.cpp > dsp.cpp.pretty
	mv dsp.cpp.pretty dsp.cpp
	tidy --quiet y -utf8 --vertical-space y --tidy-mark n -indent -wrap 80 < send.html > send.html.pretty
	mv send.html.pretty send.html
	tidy --quiet y -utf8 --vertical-space y --tidy-mark n -indent -wrap 80 < recv.html > recv.html.pretty
	mv recv.html.pretty recv.html
	tidy --quiet y -utf8 --vertical-space y --tidy-mark n -indent -wrap 80 < main.html > main.html.pretty
	mv main.html.pretty main.html

lint:
	jslint sdrFluff.js
	jslint guiSend.js
	jslint guiRecv.js
	jslint gui.js
	jslint node-serv.js

deploy:
	cp send.html recv.html guiRecv.js  guiSend.js sdrFluff.js dsp.js ./static/. 

restart:
	sudo service apache2 reload






