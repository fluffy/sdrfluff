

Fluffy.SDR.init();
Fluffy.SDR.initTx();

function getRandomFreq()
{
    var max  = 21000.0;
    var min  = 17000.0;
    var width = 1000.0;
    
    var ret = Math.random() * (max + width - min) + min;
    ret = ret - ret%width;

    return ret;
}

function transmit()
{
    var freq = getRandomFreq();

    //freq = 18000.0;

    var val = $("#sendDataText").val(); 

    console.log("Transmit " + val + " at " + freq  );
    Fluffy.SDR.playTones( val, freq );
}

$("#sendDataText").val( Math.floor( Math.random()*9000 + 1000 ) );

setInterval( transmit , 1000 /* ms */ );



