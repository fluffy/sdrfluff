

#include <stdio.h>
#include <math.h>
#include <assert.h>

#include "dsp.h"

static int count=0;


double coherentEnergy( double freq, 
                       double sampleRate, double samples[], 
                       double symbolTime, double transitionTime,
                       double phase, int start, 
                       int numChips,
                       double chipSums[],
                       char patern[], int paternLen,
                       double refSig[] ) 
{
    int chipLength = lround( sampleRate * symbolTime );
    double scale = M_PI * 2.0 *  freq / sampleRate;
    
    for ( int i=0; i < numChips; i++ )
    {
       chipSums[ i ] = 0.0;
    }
 
    //printf( "offset = %lf \n", sampleRate*transitionTime );
    //printf( "len = %d \n", chipLength);

    double total = 0.0;
    int s=start;
    
    for ( int chip=0; chip < numChips; chip++ )
    {
       double sum = 0.0;
       for ( int i=0; i<chipLength; i++,s++ )
       {
          double coef = sinf( phase + double(s) * scale );

          // TODO optimize 
          if ( double(i) < double(sampleRate)*transitionTime ) coef = 0.0;
          if ( double(i) > double(chipLength) - double(sampleRate)*transitionTime) coef = 0.0;
          
          if ( refSig )
          {
             refSig[s] = coef;
          }

          sum += samples[s] * coef;
          //printf( "samples[%d]=%lf \n",s,samples[s] );        
       }
       
       if ( refSig )
       {
          if ( sum < 0.0 )
          {
             for ( int i=s-1; i >= s-chipLength; i-- )
             {
                refSig[i] = -refSig[i];
             }
          }
       }

       //printf( "symbol %d sum=%lf \n",chip,sum );

       chipSums[ chip ] = sum / double( chipLength );
       total += fabs( sum );

       if ( chip < paternLen )
       {
          if ( patern[chip] == 'p' )
          {
             if ( sum < 0.0 ) return 0.0;
          }
          if ( patern[chip] == 'n' )
          {
             if ( sum > 0.0 ) return 0.0;
          }
       }
    }
    
    return total / double( s-start );
}


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

   double eMax = 0.0;
   double phaseMax = 0.0;
   int startMax = 0;
   double chipSums[numSymbols];
   
   double phase = 0.0;
   int len = lround( sampleRate * symbolTime * numSymbols );
   for ( double phase=0.0; phase < M_PI*2.0; phase += M_PI / 5.0 )
   {
      for ( int start=0; start+len < numSamples-1; start += lround( sampleRate * symbolTime / 5.0 ) )
      {
         double e = coherentEnergy( frequency, sampleRate, samples, 
                                    symbolTime, transitionTime, phase, start, numSymbols, chipSums, 
                                    patern, paternLen, NULL );
         if ( e > eMax )
         {
            eMax = e;
            phaseMax = phase;
            startMax = start;
         }
      }
   }

   for ( int i=0; i < numSamples ; i++ )
   {
      refSig[i] = 0.0;
   }

   coherentEnergy( frequency, sampleRate, samples, 
                   symbolTime, transitionTime, phaseMax, startMax, numSymbols, chipSums,  
                   patern, paternLen,
                   refSig );
   
   printf("eMax = %lf \n", eMax );
   printf("phaseMax = %lf deg \n", phaseMax*180.0/M_PI );
   printf("startMax = %d (%lf ms) \n", startMax, double(startMax)*double(1000.0)/double(sampleRate) );
   for ( int chip=0; chip < numSymbols; chip++ )
   {
      //printf( "Chip %d e=%lf\n", chip,chipSums[chip] );
   }
 
   printf( "Chips = 1" ); // force first chip to be 1 
   for ( int chip=1; chip < numSymbols; chip++ )
   {
      // check if sign of e and ePrev are the same 
      int sameSign = ( chipSums[chip-1] * chipSums[chip] >= 0.0 ) ? 1 : 0 ; 
      printf( "%d",sameSign );
      if ( chip % 4 == 3 ) printf(" ");
   }
   printf("\n\n");
   

   return 0;
}



