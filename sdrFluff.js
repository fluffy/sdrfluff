
var Fluffy = Fluffy || {}; // setup namespace

Fluffy.SDR = function() // setup module 
{
    // private stuff

    var symbolTime = 0.0032; // 0.032;
    var transitionTime = 0.0008; // 0.008;
    var frequency = 18000; // 1100
    var squelchSNR = 25.0; // 25 

    var audioContext;
    var osc;
    var gain;
    var microphone;
    var processor;

    var audioBufferSize = 2048; // must be power of 2 

    var bufSize = 8 * 48000 * 0.500; // 8 byte sammples * samplerate * time seconds  
    var bufIn;
    var bufOut;
    var bufLoc = 0;

    var oldStartTime = 0.0; // TODO - rename 
    var oldTimeRange = 0.5;

    var privRunMode = "once";

    function hasGetUserMedia() 
    {
        return !!(navigator.getUserMedia
                  || navigator.mozGetUserMedia 
                  || navigator.webkitGetUserMedia 
                  || navigator.msGetUserMedia);
    }


    function gumStream(stream)
    {
        console.log("Got GUM stream");
        
        microphone = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor( audioBufferSize, 2, 2 );
        processor.onaudioprocess = processAudio;
        
        microphone.connect(processor);
        processor.connect(audioContext.destination);
    }


    function gumError(err)
    {
        console.log("The following GUM error occured: " + err);
    }


    function processAudio(e) 
    {
        //console.log( "In processAudio");
        var lIn = e.inputBuffer.getChannelData(0);
        var rIn = e.inputBuffer.getChannelData(1);
        var lOut = e.outputBuffer.getChannelData(0);
        var rOut = e.outputBuffer.getChannelData(1);
        
        if ( lIn.length > audioBufferSize )
        {
            alert("something bad happended");
        }
        
        if ( privRunMode !== "stop" )
        {
            for (var i = 0; i < lIn.length; i++) 
            {
                Module.setValue( bufIn+bufLoc, lIn[i], 'double' ); bufLoc += 8;
                
                if ( bufLoc+8 >= bufSize )
                {
                    var foundSymMax = 4;
                    var foundSyms = Module._malloc( 4 * foundSymMax );

                    for ( var f = 17000.0; f <= 21000.0 ; f += 1000.0 ) // TODO - make paramters 
                    {
                    var e = doSoundProcess( audioContext.sampleRate, bufLoc/8, bufIn, 
                                            symbolTime, transitionTime, f, squelchSNR,
                                            bufOut, 
                                            foundSyms, foundSymMax );
                    if ( e === 0 )
                    {
                        var str = "";

                        for ( var fSym=0; fSym < foundSymMax; fSym++ )
                        {
                            var c =  Module.getValue( foundSyms + fSym*4, 'i32' );
                            if ( c !== -1 )
                            {
                                str += String.fromCharCode( c );
                            }
                        }

                        console.log( "MAIN SDR: Got '" + str + "' at " + f +" Hz"  );
                        
                        receivedData( str + " " );

                        draw( oldStartTime, oldTimeRange );

                        if ( privRunMode === "once" )
                        {
                            //console.log( "change runMode from once to stop" );
                            privRunMode = "stop";
                        }
                    }
                    }

                    if ( true ) // slide the last 75 ms of buffer to start and contiue copying
                    {
                        var slideLen = 0.075 * audioContext.sampleRate;
                        for ( var j = 0; j<slideLen; j++ )
                        {
                            var v = Module.getValue(  bufLoc - j*8  ,  'double' );
                        Module.setValue( bufIn + j*8 , v , 'double' ); bufLoc += 8;
                        }
                        bufLoc = slideLen*8;
                    }
                    else
                    {
                        bufLoc = 0; 
                    }

                    Module._free( foundSyms );
                }
            }
        }

        for (var i = 0; i < lOut.length; i++) 
        {
            lOut[i] = 0.0;
            rOut[i] = 0.0;
        }
    }

    doSoundProcess = Module.cwrap( 'soundProcess', 'number', 
                                   ['number','number','buf','number','number','number','number','buf','buf','number'] )

    
    doHammingEncode = Module.cwrap( 'hammingEncode', 'number', 
                                    ['buf','number','buf','number'] )

    // public stuff


    function draw( startTime, timeRange )
    {
        oldStartTime = startTime;
        oldTimeRange = timeRange;

        var canvas = document.getElementById('canvasWavform');

        if ( !canvas )
        {
            return ;
        }

        var drawContext = canvas.getContext('2d');
        drawContext.setTransform( 1, 0, 0, 1, 0, 0 );
        drawContext.clearRect( 0,0, drawContext.canvas.width, drawContext.canvas.height );
                
        for ( var line=0; line < 2 ; line++ )
        {
            drawContext.beginPath();
            drawContext.strokeStyle = '#0000FF'; // blue
            if ( line === 1 )
            {
                drawContext.strokeStyle = '#FF0000'; // red
            }
            drawContext.moveTo( 0, drawContext.canvas.height / 2 );
            for( var col = 0; col < drawContext.canvas.width; col++ )
            {
                var t0 = (startTime + (col/drawContext.canvas.width)*timeRange) ;  // time in seconds 
                var t1 = (startTime + ((col+1)/drawContext.canvas.width)*timeRange) ;  // time in seconds 
                
                if ( t1 > 2.0 ) 
                {
                    break;
                }
                
                var i0 = Math.round( t0 * audioContext.sampleRate );
                var i1 = Math.round( t1 * audioContext.sampleRate);
                
                for ( var i = i0 ; i < i1 ; i++ )
                {
                    var y=0.0;
                    if ( line == 0 ) 
                    {
                        y = Module.getValue( bufOut + i*8 , 'double' );
                    }
                    if ( line == 1 ) 
                    {
                        y = Module.getValue( bufIn + i*8 , 'double' );
                    }
                    var row = drawContext.canvas.height/2 - y * drawContext.canvas.height/2;
                    drawContext.lineTo( col, row );
                }
            }
            drawContext.stroke();
        }
    }


    var init = function()
    {
        if ( hasGetUserMedia() ) 
        {
            navigator.getUserMedia  = navigator.getUserMedia 
                || navigator.mozGetUserMedia 
                || navigator.webkitGetUserMedia 
                || navigator.msGetUserMedia ;
        } 
        else 
        {
            alert('Browser does not support getUserMedia. Try FireFox or Chrome');
        }

        var contextClass = window.AudioContext 
                            || window.webkitAudioContext 
                            || window.mozAudioContext 
                            || window.oAudioContext 
                            || window.msAudioContext ;
        if (contextClass) 
        {
            audioContext = new contextClass();
        } 
        else
        {
            alert('Browser does not support webAudio. Try Firefox or Chrome');
        }
    };


    var initTx = function()
    {
        osc = audioContext.createOscillator();
        osc.frequency.value = frequency;
        osc.type = 'sine';

        gain = audioContext.createGain();
        gain.gain.value = 0.0;

        osc.connect( gain )
        gain.connect( audioContext.destination );
        
        osc.start( 0 );
    };  

    var initRx = function()
    {
        navigator.getUserMedia( {audio: true} , gumStream, gumError );

        bufIn  = Module._malloc( bufSize );
        bufOut = Module._malloc( bufSize );
    };

    function playTones( data, freq )
    {
        freq = freq || frequency;

        if ( freq !== frequency )
        {
            frequency = freq;
        }

        var time = audioContext.currentTime;

        gain.gain.setValueAtTime( 0, time );
        osc.frequency.setValueAtTime( frequency, time );
        
        var prevPhase = 1
        var phase = 1
        var volume = 0.8;
        
        // first bit is start bit and should be a 1 
 
        var str = String( data );


        //console.log( "c=" + c );

       
        var rawBits = [];
        for ( var j=0; j< str.length; j++ )
        {
            var c = str.charCodeAt(j);
            for( var i=0; i<8; i++ )
            {
                var bit = ( c & (1<<i) ) ? 1 : 0;
                rawBits.push( bit ); 
            }
        }

        var numHamBits=0;
        switch (rawBits.length ) {
        case 4:
            numHamBits = 4+3;
            break;
        case 8:
            numHamBits = 8+4;
            break;
        case 16:
            numHamBits = 16+5;
            break; 
        case 24:
            numHamBits = 24+5;
            break; 
        case 32:
            numHamBits = 32+6;
            break;
        default:
            console.log( "Need to implement playTone of " + rawBits.length + " bits" );
            assert(0);
            return;
        }

        rawBits.length

        rawPtr = Module._malloc( rawBits.length * 4);
        hamPtr = Module._malloc( numHamBits * 4);
        for(  i=0; i< rawBits.length ; i++ )
        {
            Module.setValue( rawPtr + i*4, rawBits[i] , 'i32' ); 
        }

        doHammingEncode( rawPtr,rawBits.length, hamPtr,numHamBits );
        
        var hamBits = [];
        for(  i=0; i<numHamBits; i++ )
        {
            hamBits.push( Module.getValue( hamPtr + i*4, 'i32' ) ); 
        }
        Module._free( rawPtr );
        Module._free( hamPtr );


        // TODO - move up and push on to hamBits
        var bitArray = [1,0,0,1]; // start bit sequence - must match pattern in dsp.cpp TODO
        bitArray = bitArray.concat( hamBits );

       console.log( "tx bits = " + bitArray );

        time += 0.015; // wait 5 ms to start 

        for ( var repeat=0; repeat < 2; repeat++ ) // TODO - paramterize 
        {
            gain.gain.setValueAtTime( 0, time );
            for (var i = 0; i < bitArray.length; i++)
            {
                var bit = bitArray[i];
                if ( bit == "0" ) {
                    phase = -phase ;
                    //console.log( "phase=" + phase );
                }
                
                gain.gain.linearRampToValueAtTime( volume*phase, time+transitionTime );
                gain.gain.setValueAtTime( volume*phase, time+symbolTime-transitionTime );
                
                //gain.gain.linearRampToValueAtTime( 0.0, time+symbolTime ); // remove to not ramp to zero on non transition
                
                time += symbolTime ;
            }
            gain.gain.linearRampToValueAtTime( 0.0, time );
            time += 0.030; // repreat gap time time 
        }
    }


    function runMode( mode )
    {
        mode = mode.toLowerCase();
        console.log( "runMode = " + mode );
        privRunMode = mode;
    }


    var publicExport =
        {
            draw: draw,
            runMode: runMode,
            playTones: playTones,
            initTx: initTx,
            initRx: initRx,
            init: init
        };

    return publicExport;
}();



