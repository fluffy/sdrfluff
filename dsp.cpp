

#include <stdio.h>
#include <math.h>
#include <assert.h>

#include "dsp.h"


int soundProcess( int sampleRate, int numSamples, double* samples, 
                  double symbolTime, double transitionTime, double frequency,
                  double* refSig )
{
   for ( int i=0; i < numSamples ; i++ )
   {
      refSig[i] = samples[i] * 0.5;
   }

   return 0;
}

