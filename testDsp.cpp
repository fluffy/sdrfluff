#include <stdio.h>
#include <assert.h>

#include "dsp.h"

int main()
{
   const int sampleRateHz=48000;
   const int numSamples = 1*sampleRateHz;
   double samples[numSamples];
   double out[numSamples];
   double frequency = 1100.0; // 1100
   double symbolTime = 0.032; // 0.032;
   double transitionTime = 0.008; // 0.008
   double squelchSNR = 25.0; // 25

   int found[8];
   
   soundProcess( sampleRateHz, numSamples, samples, 
                 symbolTime, transitionTime, frequency, squelchSNR,
                 out, found, 8 ); 
   

   int in[8] = { 1,0,0,1, 1,0,0,1 };
   int sig[12];
   int res[8];
   
   hammingEncode( in,8, sig,12 );
   sig[ 2 ] = sig[ 2 ] ? 0 : 1;
   int e = hammingDecode( sig,12, res,8 );
  
#if 1
   printf("deocde error = %d \n",e);

   printf("sig = ");
   for( int i=0; i<12; i++ )
   {
      printf("%d ",sig[i] );
   }
   printf("\n");

   printf("in  = ");
   for( int i=0; i<8; i++ )
   {
      printf("%d ",in[i] );
   }
   printf("\n");

   printf("res = ");
   for( int i=0; i<8; i++ )
   {
      printf("%d ",res[i] );
   }
   printf("\n");
#endif
   
   for( int i=0; i<4; i++ )
   {
      assert( in[i] == res[i] );
   }   

   return 0;
}

