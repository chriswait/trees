var map;
var sydney = {
    lat: -33.8807184,
    lng: 151.2058521
};
var zoom = 14;
var map_element = document.getElementById('map');
var map_options = {
    center: sydney,
    zoom: zoom,
};
var open_infowindow;

var data_url = "data/data.json";
var markers = [];
var species = [];

function init_map() {
    map = new google.maps.Map(map_element, map_options);
    fetch_data();
}

function fetch_data() {
    // Pure javscript...
    var request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open('GET', data_url, true);
    request.onreadystatechange = function () {
          if (request.readyState == 4 && request.status == "200") {
            process_data(request.responseText);
          }
    };
    request.send(null);
}

function process_data(response_data) {
    response = JSON.parse(response_data);
    markers = response.markers;
    species = response.species;
    draw_markers();
}

function draw_marker(marker) {
    var marker_latlng = {
        lat: parseFloat(marker.lat),
        lng: parseFloat(marker.lng),
    };
    var infowindow = new google.maps.InfoWindow({
        content: marker.title,
    });
    var map_marker = new google.maps.Marker({
        map: map,
        position: marker_latlng,
        title: marker.title,
    });
    map_marker.addListener('click', function() {
        if (open_infowindow) {
            open_infowindow.close();
        }
        infowindow.open(map, map_marker);
        open_infowindow = infowindow;
    });
}

function draw_markers() {
    for (marker_index in markers) {
        var marker = markers[marker_index];
        draw_marker(marker);
    }
}
