

Fluffy.SDR.init();
Fluffy.SDR.initTx();

function getRandomFreq()
{
    var min  = 17100.0;
    var max  = 18100.0;
    var width =  500.0;
    var offset = 100.0;

    var ret = Math.random() * (max + width - min) + min;
    ret = ret - ret%width + offset;

    return ret;
}

function transmit()
{
    var freq = getRandomFreq();

    //freq = 18100.0;

    var val = $("#sendDataText").val(); 

    //Fluffy.SDR.initTx();

    console.log("Transmit " + val + " at " + freq  );
    Fluffy.SDR.playTones( val, freq );
}

$("#sendDataText").val( Math.floor( Math.random()*900000 + 100000 ) );

setInterval( transmit , 600 /* ms */ ); // TODO - needs match up with SRR record time 



