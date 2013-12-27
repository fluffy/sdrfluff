
var Fluffy = Fluffy || {}; // setup namespace

Fluffy.SDR = function() // setup module 
{
    // private stuff

    var symbolTime = 0.032; // 0.032;
    var transitionTime = 0.008; // 0.008;
    var frequency = 1100; // 1100

    var audioContext;
    var osc;
    var gain;
    var microphone;
    var processor;

    var audioBufferSize = 2048; // must be power of 2 

    var bufSize = 8 * 48000 * 2.000; // 8 byte sammples * samplerate * time seconds  
    var bufIn;
    var bufOut;
    var bufLoc = 0;


    function hasGetUserMedia() 
    {
        return !!(navigator.getUserMedia
                  || navigator.mozGetUserMedia 
                  || navigator.webkitGetUserMedia 
                  || navigator.msGetUserMedia);
    }


    function gumStream(stream)
    {
        console.log("Got GUM steram");
        
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
        
        for (var i = 0; i < lIn.length; i++) 
        {
            Module.setValue( bufIn+bufLoc, lIn[i], 'double' ); bufLoc += 8;
        
            if ( bufLoc+8 >= bufSize )
            {
                var e = doSoundProcess( audioContext.sampleRate, bufLoc/8, bufIn, 
                                    symbolTime, transitionTime, frequency,
                                    bufOut );
                bufLoc = 0;
            }
        }
    
        for (var i = 0; i < lOut.length; i++) 
        {
            lOut[i] = 0.0;
            rOut[i] = 0.0;
        }
    }

    doSoundProcess = Module.cwrap( 'soundProcess', 'number', ['number','number','buf','number','number','number','buf'] )


    // public stuff

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

        osc = audioContext.createOscillator();
        osc.frequency.value = frequency;
        osc.type = 'sine';

        gain = audioContext.createGain();
        gain.gain.value = 0.0;

        osc.connect( gain )
        gain.connect( audioContext.destination );
        
        osc.start( 0 );

        navigator.getUserMedia( {audio: true} , gumStream, gumError );

        bufIn  = Module._malloc( bufSize );
        bufOut = Module._malloc( bufSize );

    };

    function playTones()
    {
        var time = audioContext.currentTime;

        gain.gain.setValueAtTime( 0, time );
        
        var prevPhase = 1
        var phase = 1
        var volume = 0.5;
        
        // first bit is start bit and should be a 1 
        var bitArray = "1001" + "00000000" + "1111";
        for ( var count=0; count < 1; count++ )
        {
            gain.gain.setValueAtTime( 0, time );
            for (var i = 0; i < bitArray.length; i++) {
                //console.log( "bit=" + bitArray[i] );
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
            time += 0.250;
        }
    }

    var publicExport =
        {
            playTones: playTones,
            init: init
        };

    return publicExport;
}();

Fluffy.SDR.init();


