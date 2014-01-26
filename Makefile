
all: cert.pem testDsp dsp.js 

serv:
	node node-serv.js 4443 


cert.pem: openssl.cnf
	openssl req -x509 -newkey rsa:2048 -keyout privkey.pem -out cert.pem -days 30 -nodes -config openssl.cnf


testDsp: testDsp.cpp dsp.cpp dsp.h
	g++ -o testDsp testDsp.cpp dsp.cpp


dsp.js: dsp.cpp
	em++ -O1 dsp.cpp -o dsp.js -s EXPORTED_FUNCTIONS="['_soundProcess']"

VALID_TOOLCHAINS := newlib glibc pnacl

NACL_SDK_ROOT ?= $(abspath /Users/fluffy/tmp/nacl_sdk/pepper_31 )
include $(NACL_SDK_ROOT)/tools/common.mk

TARGET = testNacl
LIBS = $(DEPS) ppapi_cpp ppapi pthread

CFLAGS = -Wall
SOURCES = testNacl.cc

$(foreach src,$(SOURCES),$(eval $(call COMPILE_RULE,$(src),$(CFLAGS))))

ifeq ($(CONFIG),Release)
$(eval $(call LINK_RULE,$(TARGET)_unstripped,$(SOURCES),$(LIBS),$(DEPS)))
$(eval $(call STRIP_RULE,$(TARGET),$(TARGET)_unstripped))
else
$(eval $(call LINK_RULE,$(TARGET),$(SOURCES),$(LIBS),$(DEPS)))
endif

$(eval $(call NMF_RULE,$(TARGET),))

