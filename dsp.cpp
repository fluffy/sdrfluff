

#include <stdio.h>
#include <math.h>
#include <assert.h>

#include "dsp.h"

static int count=0;

void genTestData( int sampleRate, int numSamples, double* samples,
                  double symbolTime, double transitionTime, double frequency,
                  double startTime, int numSym );





int soundProcess( int sampleRate, int numSamples, double* samples, 
                  double symbolTime, double transitionTime, double frequency,
                  double* refSig )
{
   int numSymbols = 16;
   char patern[] = "pnpp";
   int paternLen = 4;

   if ( count == 0 )
   {
      printf( "In soundProcess %d Hz, %d Samples \n", sampleRate, numSamples );
      genTestData( sampleRate, numSamples, samples, 
                   symbolTime, transitionTime, frequency,
                   0.100 /*startTime*/, numSymbols );
      count++;
      printf( "Gen fake data" );
   }
   
   double min = 1e22;
   double max = -1e22;

   return 0;
}



void genTestData( int sampleRate, int numSamples, double* samples,
                  double symbolTime, double transitionTime, double frequency,
                  double startTime, int numSym )
{
    //    char dbits[] = "1001" "0000" "0000" "1111";
    const char pbits[] = "pnpp" "npnp" "npnp" "pppp";
    const int  bitsLen =  4     +4     +4     +4    ;


    for ( int i=0; i<numSamples; i++ )
    {
        double t = double(i) / sampleRate;
        double f1 = frequency;
        double f2 = 2000.0;
        
        double s1 = 0.5 * sinf( f1 * t * 2.0*M_PI + M_PI/2.0 ); // PSK #1
        double s2 = 0.05 * sinf( f2 * t * 2.0*M_PI + M_PI + 1.57 ); // PSK #2
        
        long bitIndex1 = lround( (t-startTime) / symbolTime - 0.5 );
      
        if ( bitIndex1 < 0 )
        {
            bitIndex1 = 0;
            s1 = 0.0;
        }
        if ( bitIndex1 >= bitsLen )
        {
            bitIndex1 = bitsLen-1;
            s1 = 0.0;
        }

        if (  pbits[bitIndex1] == 'n'  )
        {
           s1 = -s1; // invert phase 
        }
        
        double dataI = s1 + s2 ;

        samples[i] = dataI;
    }
}

