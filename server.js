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
            var tree_data = $("#maincontent").children()[0].children[0].data;
            var tree_data_json = tree_data.split("= ")[1].slice(0, -2);
            var output = '{"trees":' + tree_data_json + "}";
            console.log("Storing tree data");
            fs.writeFile(tree_data_path, output, function(err) {
                if (err) return console.log(err);
            });
            console.log("Done!");
        } else {
            console.log("Error fetching data:");
            console.log(error);
        }
    });
};

app.get('/trees', function(req, res) {
    var tree_data = require(tree_data_path);

    function trim(input) {
        return input.replace(/^\s+|\s+$/g, "");
    }

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
    }

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

    var response = JSON.stringify(trees, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.send(response);
});

//get_data();

console.log("Serving application");
app.listen('8082');
exports = module.exports = app;
