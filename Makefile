
all: cert.pem

serv:
	node node-serv.js 4443 


cert.pem: openssl.cnf
	openssl req -x509 -newkey rsa:2048 -keyout privkey.pem -out cert.pem -days 30 -nodes -config openssl.cnf

