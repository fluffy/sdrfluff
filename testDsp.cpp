#include <stdio.h>
#include <assert.h>

#include "dsp.h"

int main()
{
   const int sampleRateHz=48000;
   const int numSamples = 1*sampleRateHz;
   double samples[numSamples];
   double out[numSamples];
   double frequency = 1100.0;
   double symbolTime = 0.032; // 0.032;
   double transitionTime = 0.008; // 0.008
   
   soundProcess( sampleRateHz, numSamples, samples, 
                 symbolTime, transitionTime, frequency,
                 out ); 
   
   return 0;
}

