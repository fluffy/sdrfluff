/*jslint browser: true, vars: true, todo: true, unparam: true*/
/*global  $*/
/*global  Fluffy*/

"use strict";

Fluffy.SDR.init();
Fluffy.SDR.initRx();
Fluffy.SDR.initTx();

$(function () {
    $("#slider-range").slider({
        range: true,
        min: 0,
        max: 2000,
        values: [0, 500],
        slide: function (event, ui) {
            var startTime = ui.values[0] / 1000.0;
            var timeRange = (ui.values[1] - ui.values[0]) / 1000.0;
            Fluffy.SDR.draw(startTime, timeRange);
        }
    });
});

function txButtonClick() {
    Fluffy.SDR.playTones("ABCD");
}

$(".dropdown-menu li a").click(function () {
    Fluffy.SDR.runMode($(this).text());
});

$("#sendDataText").change(function () {
    var send = $("#sendDataText");
    console.log("changed to " + send.val());

    Fluffy.SDR.playTones(send.val());

    send.val("");
});


function receivedData(data) {
    var recv = $("#recvDataText");
    var str = recv.val();
    str += data;
    recv.val(str);
}
