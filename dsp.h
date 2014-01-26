
#include <stdint.h>

extern "C" 
{
   int soundProcess( int sampleRateHz, int numSamples, double* samples, 
                     double symbolTime, double transitionTime, double frequency, double squelchSNR,
                     double* refSig,  int32_t result[], int maxResult );

   int hammingEncode( int32_t* in, int inSize, int32_t* out, int outSize );
   int hammingDecode( int32_t* in, int inSize, int32_t* out, int outSize );
   
}

