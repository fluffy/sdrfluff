

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
      //refSig[i] = samples[i] * 0.5;
      refSig[i] = double( i%4800 ) / 4800.0;
   }

   //printf("samp zero = %lf \n",samples[0] );
   
   return 0;
}


