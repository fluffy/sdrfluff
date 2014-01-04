
all: cert.pem testDsp dsp.js 

serv:
	node node-serv.js 4443 


cert.pem: openssl.cnf
	openssl req -x509 -newkey rsa:2048 -keyout privkey.pem -out cert.pem -days 30 -nodes -config openssl.cnf


testDsp: testDsp.cpp dsp.cpp dsp.h
	g++ -o testDsp testDsp.cpp dsp.cpp


dsp.js: dsp.cpp
	em++ -O1 dsp.cpp -o dsp.js -s EXPORTED_FUNCTIONS="['_soundProcess','_hammingEncode','_hammingDecode']"
