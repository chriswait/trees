var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

var tree_data_path = './data/tree_data.json';
var trees_url = "http://trees.cityofsydney.nsw.gov.au/map/";

var get_data = function() {
    console.log("Fetching tree data");
    request(trees_url, function(error, response, html) {
        if (!error) {
            console.log("Scraping tree data");
            var $ = cheerio.load(html);
            var tree_data_js = $("#maincontent").children()[0].children[0].data;
            var tree_data_list_text = tree_data_js.split("= ")[1].slice(0, -2);
            var tree_data = JSON.parse('{"trees": ' + tree_data_list_text + '}');
            process_data(tree_data);
        } else {
            console.log("Error fetching data:");
            console.log(error);
        }
    });
};

var process_data = function(tree_data) {
        console.log("Processing tree data");

        function trim(input) {
            return input.replace(/^\s+|\s+$/g, "");
        };

        function get_species_list(tree_species_text) {
            var tree_species_list = [];
            if (tree_species_text.indexOf(';') == -1) {
                tree_species_list = [tree_species_text];
            } else {
                var species_list = tree_species_text.split(';');
                for (j=0; j<species_list.length; j++) {
                    var trimmed = trim(species_list[j]);
                    if (trimmed) tree_species_list.push(trimmed);
                }
            }
            return tree_species_list;
        };

        var trees = [];
        for (var i=0; i < tree_data.trees.length; i++) {
            var tree = tree_data.trees[i];
            if (typeof tree.custom_fields.species != "undefined" && tree.custom_fields.species) {
                var tree = tree_data.trees[i];
                var tree_species_text = trim(tree_data.trees[i].custom_fields.species.split(":")[1]);
                var tree_species_list = get_species_list(tree_species_text);
                trees.push({
                    "title": tree.title,
                    "lat": tree.custom_fields.lat,
                    "lng": tree.custom_fields.lng,
                    "species": tree_species_list,
                });
            }
        }

        var all_species = [];
        for (var i=0; i< trees.length; i++) {
            var species = trees[i].species;
            for (var j=0; j < species.length; j++) {
                var species_name = species[j].substr(species[j].indexOf(' ')+1);
                if (all_species.indexOf(species_name) == -1) all_species.push(species_name);
            }
        }

        var data = {
                trees: trees,
                species: all_species,
        };
        var output = JSON.stringify(data, null, 2);

        console.log("Storing tree data");
        fs.writeFile(tree_data_path, output, function(err) {
            if (err) return console.log(err);
        });
        console.log("Done!");
};

app.get('/trees', function(req, res) {
    var tree_data = require(tree_data_path);
    var response = JSON.stringify(tree_data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
});

get_data();

console.log("Serving application");
app.listen('8082');
exports = module.exports = app;
