

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
                  double symbolTime, double transitionTime, double frequency, double squelchSNR,
                  double* refSig,
                  int32_t result[], int maxResult )
{
   int numSymbols = 16;
   char patern[] = "pnpp"; // must match start bits in bitArray in sdrFluff.js TODO
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
   printf("SNR = %lf dB  max = %lf \n", snr , 10.0 * log10( max  ) );

   if ( snr < squelchSNR )
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
   
#if 0
   printf("eMax = %lf \n", eMax );
   printf("phaseMax = %lf deg \n", phaseMax*180.0/M_PI );
   printf("startMax = %d (%lf ms) \n", startMax, double(startMax)*double(1000.0)/double(sampleRate) );
   for ( int chip=0; chip < numSymbols; chip++ )
   {
      //printf( "Chip %d e=%lf\n", chip,chipSums[chip] );
   }
 #endif
   
   int32_t rawBits[ numSymbols ];
   
   //printf( "Chips = 1" ); // force first chip to be 1 
   rawBits[0] = 1;
   for ( int chip=1; chip < numSymbols; chip++ )
   {
      // check if sign of e and ePrev are the same 
      int sameSign = ( chipSums[chip-1] * chipSums[chip] >= 0.0 ) ? 1 : 0 ; 
      rawBits[ chip ] = sameSign;
      
      //printf( "%d", rawBits[ chip ] );
      if ( chip % 4 == 3 ) printf(" ");
   }
   //printf("\n\n");
   
   assert( numSymbols == 16 );
   int32_t hamBits[8];
   int err = hammingDecode( &(rawBits[4]), 12, hamBits, 8 );
   
   //printf( "revcd bits = " );
   int c=0;
   for (int i=0; i<8; i++ )
   {
      // printf( "%d ", hamBits[i]  );
      
      if ( hamBits[i] != 0 )
      {
         c += ( 1 << i );
      }
   }
   //printf("\n");
   
   //printf("got char %d \n", c );

   assert( 0 < maxResult );
   result[0] = c;
   
   if (err != 0)
   {
      //printf("return doSound parity error\n");
      return 2;
   }
   
   return 0;
}


int hammingEncode( int32_t* in, int32_t inSize, int32_t* out, int32_t outSize )
{
   int32_t outBit = 1;
   int32_t parityBit = 1;
   int32_t inBit = 1;
   
   // put the data bits in the output at correct location 
   while ( outBit <= outSize )
   {
      int32_t parityPower = 1 << (parityBit-1);
      if ( outBit == parityPower )
      {
         out[outBit-1] = 0;
         parityBit++;
      }
      else
      {
         assert( inBit-1 < inSize );
         out[outBit-1] = in[ inBit-1 ];
         inBit++;
      }
      outBit++;
   }

   // compute the parity bits 
   parityBit--;
   while ( parityBit >= 1 )
   {
      int32_t parityPower = 1 << (parityBit-1);
      
      int32_t parity = 0;
      for( int32_t i=parityPower; i<= outSize; i++ )
      {
         if ( i & parityPower )
         {
            parity = parity ^ out[ i-1 ];
         }
      }
      out[ parityPower-1 ] = parity;
      
      parityBit--;
   }

#if 0 
   printf("ham encode in  = ");
   for( int i=0; i<inSize; i++ )
   {
      printf( " %d " , in[i] );
   }
   printf("\n");
   
   printf("ham encode out =");
   for( int i=0; i<outSize; i++ )
   {
      printf( " %d " , out[i] );
   }
   printf("\n");
#endif

   return 0;
}


int hammingDecode( int32_t* in, int32_t inSize, int32_t* out, int32_t outSize )
{
   int32_t inBit = 1;
   int32_t parityBit = 1;

   int32_t errorBit = 0;
   
   // check the parity bits 
   while ( inBit <= inSize )
   {
      int32_t parityPower = 1 << (parityBit-1);

      if ( inBit == parityPower )
      {
         //check this parity bit 
         int32_t parity =0;
          for( int32_t i=parityPower; i<= inSize; i++ )
          {
             if ( i & parityPower )
             {
                parity = parity ^ in[ i-1 ];
             }
          }
          if ( parity != 0 )
          {
             //printf("PARITY ERROR \n" );
             
             // found a parity error 
             errorBit += inBit;
          }
         parityBit++;
      }

      inBit++;
   }

   // correct the bit with error 
   if ( errorBit > 0 )
   {
      if ( errorBit-1 < inSize ) // check it is in range 
      {
         in[ errorBit-1 ] = in[ errorBit-1 ] ? 0 : 1; // flip input bit at
                                                      // errorBit 
      }
   }
   
   inBit = 1;
   parityBit = 1;
   int32_t outBit = 1;

   // collect the data bits from the correct location 
   while ( inBit <= inSize )
   {
      int32_t parityPower = 1 << (parityBit-1);
      if ( inBit == parityPower )
      {
         parityBit++;
      }
      else
      {
         assert( outBit-1 < outSize );
         out[outBit-1] = in[ inBit-1 ];
         outBit++;
      }
      inBit++;
   }

   if ( errorBit > 0 ) 
   {
      return 1;
   }
   
   return 0;
}


