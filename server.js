var Promise = require('bluebird');
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

var site_root = "http://trees.cityofsydney.nsw.gov.au/";
var data_url = site_root + "map/";
var location_url_root = site_root + "location/";

var raw_path = "./data/raw.json"
var data_path = './data/data.json';

var markers = [];
var all_species = [];

var trim = function(input) {
    return input.replace(/^\s+|\s+$/g, "");
};

var fetch_marker_data = function() {
    return new Promise(function(resolve, reject) {
        try {
            var marker_data = require(raw_path);
            resolve(marker_data);
        } catch (e) {
            request(data_url, function(error, response, html) {
                if (error) {
                    console.log("Error fetching data:");
                    console.log(error);
                    return reject(error);
                }
                var $ = cheerio.load(html);
                var data_js = $("#maincontent").children()[0].children[0].data;
                var data_list_text = data_js.split("= ")[1].slice(0, -2);

                fs.writeFile(raw_path, data_list_text, function(err) {
                    if (err) return console.log(err);
                });

                var marker_data = JSON.parse(data_list_text);
                resolve(marker_data);
            });
        }
    });
};

var fetch_marker_information = function(marker) {
    return new Promise(function(resolve, reject) {
        var url = location_url_root + marker.slug + "/";
        console.log(url);
        request(url, function(error, response, html) {
            if (error) {
                console.log("Error fetching data:");
                console.log(error);
                return reject(error);
            }
            var $ = cheerio.load(html);

            // Get attributes
            var location_attr_class = ".dl-location-attr";
            var location_attr_labels = ["SUBURB", "OWNERSHIP", "TREE TYPE", "AGE CLASS", "SETTING", "ORIGIN", "HEIGHT", "SPREAD", "LISTING", "DBH", "YEAR PLANTED", "OWNER"];

            var attr = $(location_attr_class);
            var labels = attr.find('dt');
            labels.each(function(index, elem) {
                elem = $(elem);
                var label_text = elem.text();
                if (location_attr_labels.indexOf(label_text.toUpperCase()) != -1) {
                    var next = $(elem.next('dd'));
                    var next_content = next.text();

                    /*
                    // Check if this value is multi-line
                    // See if the next label is blank
                    var next_label = $(elem.next('dt'));
                    var next_label_text = next_label.text();
                    console.log("NEXT" + next_label_text);

                    if (next_label && (next_label_text === "")) {
                        var next_value = $(next_label.next('dd'));
                        var next_value_text = next_value.text();

                        console.log("Next value: " + next_value_text);
                        next_content += " - " + next_value;
                    }
                    */
                    marker[label_text.toLowerCase()] = next_content;
                }
            });

            // Get entry-content
            var entry_content_class = ".entry-content";
            var entry_content = $(entry_content_class);
            var section_ids = ["DESCRIPTION", "SIGNIFICANCE", "HISTORICAL", "GALLERY", "NEW-ROYALSLIDER-1"];
            var current_section, current_section_content;
            entry_content.children().each(function(index, elem) {
                var id = $(elem).attr('id');
                if (id && (section_ids.indexOf(id.toUpperCase()) != -1)) {
                    if (current_section && current_section_content) {
                        marker[current_section.toLowerCase()] = current_section_content;
                    }
                    current_section = id;
                    current_section_content = "";
                } else {
                    current_section_content += $(elem).text()+ "\n";
                }
            });

            // Get Gallery
            marker.gallery_urls = [];
            $(".rsTmb img").each(function(index, elem) {
                if ($(elem).attr('src')) {
                    marker.gallery_urls.push($(elem).attr('src'));
                }
            });

            resolve(marker);
        });
    });
};

var process_marker = function(marker) {
    return new Promise(function(resolve, reject) {
        var new_marker = {
            "title": marker.title,
            "lat": marker.custom_fields.lat,
            "lng": marker.custom_fields.lng,
            "slug": marker.slug
        };

        // Get species
        var species_list = [];
        if (typeof marker.custom_fields.species != "undefined" && marker.custom_fields.species) {
            var tree_species_text = trim(marker.custom_fields.species.split(":")[1]);
            var species_text_list = tree_species_text.split(';');
            for (var j=0; j<species_text_list.length; j++) {
                var species = trim(species_text_list[j]);
                if (species) {
                    var species_name = species.substr(species.indexOf(' ')+1);
                    var species_count = species.substr(0, species.indexOf(' '));
                    species_list.push({
                        name: species_name,
                        count: species_count
                    });
                    if (all_species.indexOf(species_name) == -1) {
                        all_species.push(species_name);
                        console.log("ADDING SPECIES: " + species.length);
                    }
                }
            }
        }
        new_marker.species = species_list;

        fetch_marker_information(new_marker)
        .then(function(new_marker_with_info) {
            markers.push(new_marker_with_info);
            console.log("ADDING MARKER: " + markers.length);
            resolve(new_marker_with_info);
        });
    });
};

var process_marker_data = function(marker_data) {
    var marker_promises = [];
    for (var i=0; i < marker_data.length; i++) {
        var marker = marker_data[i];
        var marker_promise = process_marker(marker);
        marker_promises.push(marker_promise);
    }
    return Promise.all(marker_promises);
};

var write_data = function() {
    console.log("markers: " + markers.length);
    console.log("species: " + all_species.length);
    var data = {
            markers: markers,
            species: all_species
    };
    var output = JSON.stringify(data, null, 2);
    fs.writeFile(data_path, output, function(err) {
        if (err) return console.log(err);
    });
};

app.get('/data', function(req, res) {
    var data = require(data_path);
    var response = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
});

if (true) {
    fetch_marker_data()
    .then(function(marker_data) {
        process_marker_data(marker_data)
        .then(function() {
            write_data();
        });
    })
}

app.listen('8082');
exports = module.exports = app;
