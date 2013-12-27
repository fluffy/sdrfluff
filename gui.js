
$(function() {
    $( "#slider-range" ).slider({
        range: true,
        min: 0,
        max: 2000,
        values: [ 0, 500 ],
        slide: function( event, ui ) {
            var startTime = ui.values[0] / 1000.0 ;
            var timeRange = (ui.values[1] - ui.values[0]) / 1000.0;
            Fluffy.SDR.draw(startTime,timeRange);
        }
    });
});

function rxButtonClick()
{
}

function txButtonClick()
{
    Fluffy.SDR.playTones();
}

$(".dropdown-menu li a").click(function()
{
    Fluffy.SDR.runMode( $(this).text() );
});
