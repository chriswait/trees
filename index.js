var data_url = "data/data.json";
var markers = [];
var species = [];

// Map stuff
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
    disableDefaultUI: true
};
var open_infowindow;

function generateMapStyle() {
var styles = [
        {
            "elementType": "geometry.fill",
            "stylers": [ { "hue": "#88ff00" } ]
        },{
            "elementType": "geometry.stroke",
            "stylers": [ { "visibility": "off" } ]
        },{
            "featureType": "water",
            "elementType": "geometry.fill",
            "stylers": [ { "saturation": -31 }, { "hue": "#00eeff" }, { "lightness": -22 } ]
        },{
            "elementType": "labels.icon",
            "stylers": [ { "hue": "#2bff00" }, { "visibility": "off" } ]
        },{
            "featureType": "poi.park",
            "elementType": "geometry.fill",
            "stylers": [ { "visibility": "on" }, { "hue": "#5eff00" }, { "gamma": 0.71 }, { "saturation": 17 } ]
        },{
            "featureType": "road.highway",
            "stylers": [ { "hue": "#ff9900" }, { "saturation": -24 }, { "visibility": "simplified" } ]
        }, {
            "featureType": "landscape.man_made",
            "stylers": [ { "hue": "#00ff19" }, { "saturation": -7 }, { "gamma": 0.86 } ]
        }
    ];
    var styledMap = new google.maps.StyledMapType(styles, { name: "Styled Map" });
    return styledMap;
}

function init_map() {
    map = new google.maps.Map(map_element, map_options);
    map.mapTypes.set('map_style', generateMapStyle());
    map.setMapTypeId('map_style');
    google.maps.event.addListener(map, "click", function(event) {
        if (open_infowindow) {
            open_infowindow.close();
        }
    });

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
