
#include <stdlib.h>
#include <string.h>

#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"

class SdrInstance : public pp::Instance 
{
 public:
  explicit SdrInstance(PP_Instance instance)
      : pp::Instance(instance) {}
  virtual ~SdrInstance() {}

  virtual void HandleMessage( const pp::Var& msg );
};

class SdrModule : public pp::Module 
{
 public:
  SdrModule() : pp::Module() {}
  virtual ~SdrModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) 
  {
    return new SdrInstance(instance);
  }
};

namespace pp {
  Module* CreateModule()
  { 
    return new SdrModule(); 
  }
} 

void SdrInstance::HandleMessage( const pp::Var& msg )
{
  if ( !msg.is_string() )
    {
      return;
    }
  
  std::string message = msg.AsString();
  
  std::string str = "Hi";

  pp::Var ret( str );

  PostMessage(ret);
}
