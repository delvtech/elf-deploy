'use strict';

const fs = require('fs');
const path = require("path");
const json2md = require("json2md")

let json = [
    { h1: "Element Finance Changelog" },
]

let files  = [];

function traverse(directory) {
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) return traverse(absolute);
        else if (absolute.endsWith(".json")){
         return files.push(absolute);
        }
    });
}

traverse("./releases/");

// get different network names.  
// end result is something like: [ 'goerli', 'mainnet' ]
let networks = []
files.forEach(file => {
    // info looks something like: 'releases/goerli/v1.0.0-a.1/addresses.json' 
    let info = file.split('/');
    // info[1] is goerli
    networks.push(info[1])
});
networks = Array.from(new Set(networks));
//console.log(networks);

// get different releases in each network
// end result is something like: [["v1.0.0-a.1", "v1.0.0"],["v1.0.0-a.2", "v1.0.1"]]
let releases = []
let index = -1;
networks.forEach(network => {
    releases.push([]);
    index += 1;
    json.push({ h2: network})
    files.forEach(file => {
        // info looks something like: 'releases/goerli/v1.0.0-a.1/addresses.json' 
        let info = file.split('/');
        // info[1] is goerli
        if (info[1]==network){
            let url = "https://raw.githubusercontent.com/element-fi/elf-deploy/release-management/changelog/releases/" 
            // info[2] is v1.0.0-a.1
            url = url + network + "/" + info[2] + "/addresses.json"
            releases[index].push({ link: { title: info[2], source: url } })
        }
    })
    json.push({ ul: releases[index] })
});
console.log(json);




let markdown = json2md(json)


fs.writeFile("README.md", markdown, err => {
    if (err) {
        console.error(err)
        return
    }
});

