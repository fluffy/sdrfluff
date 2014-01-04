/*jslint browser: true, vars: true, todo: true, plusplus: true, nomen: true, bitwise: true */
/*global  $*/
/*global  Module*/
/*global  assert*/
/*global  alert*/
/*global receivedData*/ // TODO - need to pass in 
// /*jslint white: true*/

"use strict";

var Fluffy;
Fluffy = Fluffy || {}; // setup namespace

//TODO  - move
function myTimeMS() {
    if (window.performance) {
        return window.performance.now();
    }
    return new Date().getTime();
}

// setup module 
Fluffy.SDR = (function () {

    var symbolTime = 0.0032; // 0.032;
    var transitionTime = 0.0008; // 0.008;
    var frequency = 18000; // 1100
    var squelchSNR = 0.0; // 25 

    var overlapAudioWindows = false;

    var audioContext;
    var osc;
    var gain;
    var microphone;
    var processor;

    var audioBufferSize = 2048; // must be power of 2 

    var bufSize = 8 * 48000 * 0.600; // 8 byte samples * samplerate * time seconds  
    var bufIn;
    var bufOut;
    var bufLoc = 0;

    var oldStartTime = 0.0; // TODO - rename 
    var oldTimeRange = 0.5;

    var privRunMode = "once";

    var lastComputeTime;

    function hasGetUserMedia() {
        return !!(navigator.getUserMedia
            // || navigator.mozGetUserMedia // TODO put back in when FF bug fixed 
            || navigator.webkitGetUserMedia || navigator.msGetUserMedia);
    }

    var doSoundProcess = Module.cwrap('soundProcess', 'number', ['number', 'number', 'buf', 'number', 'number', 'number', 'number', 'buf', 'buf', 'number']);


    var doHammingEncode = Module.cwrap('hammingEncode', 'number', ['buf', 'number', 'buf', 'number']);


    function draw(startTime, timeRange) {
        var canvas;
        var drawContext;
        var line;
        var col;
        var t0;
        var t1;
        var i0;
        var i1;
        var i;
        var y;
        var row;

        oldStartTime = startTime;
        oldTimeRange = timeRange;

        canvas = document.getElementById('canvasWavform');

        if (!canvas) {
            return;
        }

        drawContext = canvas.getContext('2d');
        drawContext.setTransform(1, 0, 0, 1, 0, 0);
        drawContext.clearRect(0, 0, drawContext.canvas.width, drawContext.canvas.height);

        for (line = 0; line < 2; line++) {
            drawContext.beginPath();
            drawContext.strokeStyle = '#0000FF'; // blue
            if (line === 1) {
                drawContext.strokeStyle = '#FF0000'; // red
            }
            drawContext.moveTo(0, drawContext.canvas.height / 2);
            for (col = 0; col < drawContext.canvas.width; col++) {
                t0 = (startTime + (col / drawContext.canvas.width) * timeRange); // time in seconds 
                t1 = (startTime + ((col + 1) / drawContext.canvas.width) * timeRange); // time in seconds 

                if (t1 > 2.0) {
                    break;
                }

                i0 = Math.round(t0 * audioContext.sampleRate);
                i1 = Math.round(t1 * audioContext.sampleRate);

                for (i = i0; i < i1; i++) {
                    y = 0.0;
                    if (line === 0) {
                        y = Module.getValue(bufOut + i * 8, 'double');
                    }
                    if (line === 1) {
                        y = Module.getValue(bufIn + i * 8, 'double');
                    }
                    row = drawContext.canvas.height / 2 - y * drawContext.canvas.height / 2;
                    drawContext.lineTo(col, row);
                }
            }
            drawContext.stroke();
        }
    }


    function processAudio(event) {
        //console.log( "In processAudio");
        var lIn = event.inputBuffer.getChannelData(0);
        //var rIn = event.inputBuffer.getChannelData(1);
        var lOut = event.outputBuffer.getChannelData(0);
        var rOut = event.outputBuffer.getChannelData(1);
        var i;
        var f;
        var foundSymMax;
        var foundSyms;
        var now;
        var start;
        var e;
        var end;
        var fSym;
        var c;
        var slideLen;
        var j;
        var v;
        var str;

        if (lIn.length > audioBufferSize) {
            assert(0);
            alert("something bad happended");
        }

        if (privRunMode !== "stop") {
            for (i = 0; i < lIn.length; i++) {
                Module.setValue(bufIn + bufLoc, lIn[i], 'double');
                bufLoc += 8;

                if (bufLoc + 8 >= bufSize) {
                    foundSymMax = 9;
                    foundSyms = Module._malloc(4 * foundSymMax);

                    now = myTimeMS();
                    console.log("Cycle time is " + (now - lastComputeTime) + " ms");
                    lastComputeTime = now;

                    // TODO - make paramters 
                    for (f = 17100.0; f <= 18100.0; f += 500.0) {
                        start = myTimeMS();

                        e = doSoundProcess(audioContext.sampleRate, bufLoc / 8, bufIn,
                                           symbolTime, transitionTime, f, squelchSNR,
                                           bufOut,
                                           foundSyms, foundSymMax);

                        end = myTimeMS();

                        console.log("    Run time is " + (end - start) + " ms");

                        if (e === 0) {
                            str = "";

                            for (fSym = 0; fSym < foundSymMax; fSym++) {
                                c = Module.getValue(foundSyms + fSym * 4, 'i32');
                                if (c !== -1) {
                                    str += String.fromCharCode(c);
                                }
                            }

                            console.log("MAIN SDR: Got '" + str + "' at " + f + " Hz");

                            receivedData(str + " ");

                            draw(oldStartTime, oldTimeRange);

                            if (privRunMode === "once") {
                                //console.log( "change runMode from once to stop" );
                                privRunMode = "stop";
                            }
                        }
                    }

                    // slide the last 75 ms of buffer to start and contiue copying
                    if (overlapAudioWindows) {
                        slideLen = 0.075 * audioContext.sampleRate;
                        for (j = 0; j < slideLen; j++) {
                            v = Module.getValue(bufLoc - j * 8, 'double');
                            Module.setValue(bufIn + j * 8, v, 'double');
                            bufLoc += 8;
                        }
                        bufLoc = slideLen * 8;
                    } else {
                        bufLoc = 0;
                    }

                    Module._free(foundSyms);
                }
            }
        }

        for (i = 0; i < lOut.length; i++) {
            lOut[i] = 0.0;
            rOut[i] = 0.0;
        }
    }

    function gumStream(stream) {
        console.log("Got GUM stream");

        microphone = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(audioBufferSize, 2, 2);
        processor.onaudioprocess = processAudio;

        microphone.connect(processor);
        processor.connect(audioContext.destination);
    }


    function gumError(err) {
        console.log("The following GUM error occured: " + err);
    }


    var init = function () {
        if (hasGetUserMedia()) {
            navigator.getUserMedia = navigator.getUserMedia
            //  || navigator.mozGetUserMedia // TODO - put back in wehn FF when bug fixed
                || navigator.webkitGetUserMedia || navigator.msGetUserMedia;
        } else {
            alert('Browser does not support working getUserMedia. Try Chrome'); // TODO - fix for FF when bug fixed
        }

        var ContextClass = window.AudioContext || window.webkitAudioContext
        //  || window.mozAudioContext // TODO put back in when FF when bug fixed
            || window.oAudioContext || window.msAudioContext;
        if (ContextClass) {
            audioContext = new ContextClass();
        } else {
            alert('Browser does not support working webAudio. Try  Chrome'); // TODO - fix for FF when bug fixed
        }
    };


    var initTx = function () {

        console.log("Did initTx");

        osc = audioContext.createOscillator();
        osc.frequency.value = frequency;
        osc.type = 'sine';

        gain = audioContext.createGain();
        gain.gain.value = 0.0;

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(0);
    };

    var initRx = function () {

        console.log("Did initRx");

        navigator.getUserMedia({
            audio: true
        }, gumStream, gumError);

        bufIn = Module._malloc(bufSize);
        bufOut = Module._malloc(bufSize);
    };

    function playTones(data, freq) {

        console.log("PlayTone for " + data + " at " + freq);

        var phase = 1.0;
        var volume = 0.8;

        var j;
        var i;
        var repeat;
        var str;
        var time;
        var sum;
        var rawBits = [];
        var c;
        var bit;
        var numHamBits = 0;
        var rawPtr;
        var hamPtr;
        var hamBits = [];
        var bitArray = [];

        freq = freq || frequency;

        if (freq !== frequency) {
            frequency = freq;
        }

        time = audioContext.currentTime;

        gain.gain.setValueAtTime(0, time + 0.011); // TODO - move these to be 15 ms in ? 
        osc.frequency.setValueAtTime(frequency, time + 0.013); // change freq with gain at zero
        time += 0.015; // wait 15 ms to start 
        gain.gain.setValueAtTime(0, time);

        str = String(data);

        // TODO - move all this encoding to dsp.cpp file 

        // add the checksum 
        sum = 0;
        for (j = 0; j < str.length; j++) {
            sum += str.charCodeAt(j);
        }
        sum = sum & 0xF;
        console.log("check sum is " + sum);
        str += String.fromCharCode(sum);

        for (j = 0; j < str.length; j++) {
            c = str.charCodeAt(j);
            for (i = 0; i < 8; i++) {
                bit = (c & (1 << i)) ? 1 : 0;
                rawBits.push(bit);
            }
        }

        switch (rawBits.length) {
        case 4:
            numHamBits = 4 + 3;
            break;
        case 8:
            numHamBits = 8 + 4;
            break;
        case 16:
            numHamBits = 16 + 5;
            break;
        case 24:
            numHamBits = 24 + 5;
            break;
        case 32:
            numHamBits = 32 + 6;
            break;
        case 40:
            numHamBits = 40 + 6;
            break;
        case 48:
            numHamBits = 48 + 6;
            break;
        case 56:
            numHamBits = 56 + 6;
            break;
        case 64:
            numHamBits = 64 + 7;
            break;
        case 72:
            numHamBits = 72 + 7;
            break;
        default:
            console.log("Need to implement playTone of " + rawBits.length + " bits");
            assert(0);
            return;
        }

        //console.log( " num raw bits = " + rawBits.length + " , num ham bits = " + numHamBits );

        rawPtr = Module._malloc(rawBits.length * 4);
        hamPtr = Module._malloc(numHamBits * 4);
        for (i = 0; i < rawBits.length; i++) {
            Module.setValue(rawPtr + i * 4, rawBits[i], 'i32');
        }

        doHammingEncode(rawPtr, rawBits.length, hamPtr, numHamBits);

        for (i = 0; i < numHamBits; i++) {
            hamBits.push(Module.getValue(hamPtr + i * 4, 'i32'));
        }
        Module._free(rawPtr);
        Module._free(hamPtr);


        // TODO - move up and push on to hamBits
        // first bit is start bit and should be a 1 
        bitArray = [1, 0, 0, 1]; // start bit sequence - must match pattern in dsp.cpp TODO
        bitArray = bitArray.concat(hamBits);

        console.log("tx bits = " + bitArray);


        // TODO - paramterize 
        for (repeat = 0; repeat < 2; repeat++) {

            gain.gain.setValueAtTime(0, time);

            for (i = 0; i < bitArray.length; i++) {
                if (bitArray[i] === 0) {
                    phase = -phase;
                }

                gain.gain.linearRampToValueAtTime(volume * phase, time + transitionTime);
                gain.gain.setValueAtTime(volume * phase, time + symbolTime - transitionTime);

                //gain.gain.linearRampToValueAtTime( 0.0, time+symbolTime ); // remove to not ramp to zero on non transition

                time += symbolTime;
            }

            gain.gain.linearRampToValueAtTime(0.0, time);
            time += 0.025; // repeat time gap 
        }
    }


    function runMode(mode) {
        mode = mode.toLowerCase();
        console.log("runMode = " + mode);
        privRunMode = mode;
    }


    var publicExport = {
        draw: draw,
        runMode: runMode,
        playTones: playTones,
        initTx: initTx,
        initRx: initRx,
        init: init
    };

    return publicExport;
}());
