'use strict';

var fs = require('fs'),
    readline = require('readline'),
    jsonfile = require('jsonfile');

var lineReader = readline.createInterface({
  input: require('fs').createReadStream('./data/loanStats_2007_2011.csv')
});

var count = 0;
lineReader.on('line', function(line) {
  lineReader.pause();
  if(count === 1) {
    var key = line.split(',');
    console.log(key)
    key = key.map(function(entry) {
      return entry.substring(1, entry.length-1);
    });
    var jsonOutput = {
      key: key
    };
    jsonfile.writeFile('./Data_Processing/legend.json', jsonOutput);
    lineReader.close();
  }
  count++;
});

