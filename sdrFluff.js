
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

    function hasGetUserMedia() 
    {
        return !!(navigator.getUserMedia
                  || navigator.mozGetUserMedia 
                  || navigator.webkitGetUserMedia 
                  || navigator.msGetUserMedia);
    }

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
Fluffy.SDR.playTones();

