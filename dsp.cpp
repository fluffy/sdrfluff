

#include <stdio.h>
#include <math.h>
#include <assert.h>

#include "dsp.h"

static int count=0;


double nonCoherentEnergy( double freq, double sampleRate, double samples[], int start, int end) 
{
    assert( freq > 0.0 );
    
    float waveLength = sampleRate / freq;
    
    // Goertzel filter
    double omega = 2.0 * M_PI / waveLength;
    double sinOmega = sin( omega );
    double cosOmega = cos( omega );
    double c = 2.0 * cosOmega;
    
    double u = 0.0;
    double uPrev = 0.0;
    double uPrevPrev = 0.0;
    
    for( int i=start; i<end; i++ )
    {
        u = c * uPrev - uPrevPrev + samples[i];
        uPrevPrev = uPrev;
        uPrev = u;
    }
    
    double i = (uPrev - uPrevPrev * cosOmega ) * 2.0 / float(end-start);
    double q = (uPrevPrev * sinOmega ) * 2.0 / float(end-start);
    
    double energy = sqrt( i*i + q*q );
    
    return energy;
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

   int chipSize = int( round( double(sampleRate) * symbolTime ) );
   

   for ( int i=0; i < numSamples-chipSize ; i += chipSize )
   {
      double e = nonCoherentEnergy( frequency, sampleRate, samples, i, i+chipSize );

      if ( e > 0 )
      {
         if ( e < min ) min = e;
         if ( e > max ) max = e;
      }
   }
   
   double snr = 0.0;
   if ( min > 0.0 )
   {
      snr = 10.0 * log10( max / min );
   }
   printf("SNR = %lf dB  max=%lf \n", snr , 10.0 * log10( max  ) );

   if ( snr < 25 )
   {
      return 1;
   }

   return 0;
}



