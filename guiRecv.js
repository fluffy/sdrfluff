/*jslint browser: true, vars: true, todo: true*/
/*global  $*/
/*global  Fluffy*/

"use strict";

Fluffy.SDR.init();
Fluffy.SDR.initRx();
Fluffy.SDR.runMode("run");

function receivedData(data) {
    var recv = $("#recvDataText");
    var str = recv.val();
    str += data;
    recv.val(str);
}
