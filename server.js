var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

var data_url = "http://trees.cityofsydney.nsw.gov.au/map/";
var data_path = './data/data.json';

var trim = function(input) {
    return input.replace(/^\s+|\s+$/g, "");
};

var fetch_data = function() {
    console.log("Fetching data");
    request(data_url, function(error, response, html) {
        if (!error) {
            console.log("Scraping data");
            var $ = cheerio.load(html);
            var data_js = $("#maincontent").children()[0].children[0].data;
            var data_list_text = data_js.split("= ")[1].slice(0, -2);
            var marker_data = JSON.parse(data_list_text);
            process_data(marker_data);
        } else {
            console.log("Error fetching data:");
            console.log(error);
        }
    });
};

var process_data = function(marker_data) {
    console.log("Processing data");

    var markers = [];
    var all_species = [];

    for (var i=0; i < marker_data.length; i++) {
        var marker = marker_data[i];
        if (typeof marker.custom_fields.species != "undefined" && marker.custom_fields.species) {
            var tree_species_text = trim(marker.custom_fields.species.split(":")[1]);

            var species_list = [];
            var species_text_list = tree_species_text.split(';');
            for (var j=0; j<species_text_list.length; j++) {
                var species = trim(species_text_list[j]);
                if (species) {
                    var species_count = species.substr(0, species.indexOf(' '));
                    var species_name = species.substr(species.indexOf(' ')+1);
                    if (all_species.indexOf(species_name) == -1) all_species.push(species_name);
                    species_list.push({
                        name: species_name,
                        count: species_count,
                    });
                }
            }

            markers.push({
                "title": marker.title,
                "lat": marker.custom_fields.lat,
                "lng": marker.custom_fields.lng,
                "species": species_list,
            });
        }
    }

    var data = {
            markers: markers,
            species: all_species,
    };
    var output = JSON.stringify(data, null, 2);

    console.log("Storing data");
    fs.writeFile(data_path, output, function(err) {
        if (err) return console.log(err);
    });
    console.log("Done!");
};

app.get('/data', function(req, res) {
    var data = require(data_path);
    var response = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
});

fetch_data();

console.log("Serving application");
app.listen('8082');
exports = module.exports = app;
