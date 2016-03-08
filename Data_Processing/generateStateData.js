'use strict';

var fs = require('fs'),
    readline = require('readline'),
    _ = require('lodash'),
    csvKey = require('./legend.json').key,
    jsonfile = require('jsonfile');

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('./Raw_Data/loanStats_2015.csv')
});


var count = 0;
var stateData = {};
var gradeData = {};
var totalData = {
  loanCount: 0,
  totalIncome: 0,
  loanAmount: 0,
  pastDelinquency: 0,
  delinquentFreeTradePercent: 0
};


var stateList = ['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','GU','HI','IA','ID', 'IL','IN','KS','KY','LA','MA','MD','ME','MH','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY', 'OH','OK','OR','PA','PR','PW','RI','SC','SD','TN','TX','UT','VA','VI','VT','WA','WI','WV','WY'];
stateList.forEach(function(state) {
  stateData[state] = {
    loanCount: 0,
    totalIncome: 0,
    loanAmount: 0,
    pastDelinquency: 0,
    delinquentFreeTradePercent: 0
  }
})


/**
 * Aggregate breakdowns of a given loan
 */
function aggregateBreakdowns(loan) {
  if(!gradeData[loan.grade]) {
    gradeData[loan.grade] = {
      loanCount: 0,
      totalIncome: 0,
      loanAmount: 0,
      pastDelinquency: 0,
      delinquentFreeTradePercent: 0
    }
  }

  var breakdowns = [
    stateData[loan.addr_state],
    gradeData[loan.grade],
    totalData
  ];

  breakdowns.forEach(function(breakdown) {
    breakdown.loanCount++;
    breakdown.totalIncome += parseInt(loan.annual_inc);
    breakdown.loanAmount += parseInt(loan.loan_amnt);
    breakdown.delinquentFreeTradePercent += parseInt(loan.pct_tl_nvr_dlq);
    if(parseInt(loan.delinq_2yrs)) {
      breakdown.pastDelinquency++;
    }
  });
}


/**
 * Create object (k,v) representation of loan data
 */
function lineArrayToObj(data) {
  var obj = {};
  data.forEach(function(value, index) {
    obj[csvKey[index]] = value.substring(1,value.length-1);
  });
  return obj;
}


/**
 * Average/post-process breakdown data after iterating through data
 * - Write aggregated data to JSON file
 */
function averageBreakdowns() {
  var breakdowns = [
    stateData,
    gradeData
  ];

  breakdowns.forEach(function(breakdown) {
    _.forOwn(breakdown, function(category) {
      if(category.loanCount) {
        category.avgIncome = Math.round(category.totalIncome/category.loanCount);
        category.avgLoanAmount = Math.round(category.loanAmount/category.loanCount);
        category.pastDelinquencyPercent = Math.round(100*category.pastDelinquency/category.loanCount);
        category.delinquentFreeTradePercent = Math.round(category.delinquentFreeTradePercent/category.loanCount);
      }
    });
  });

  totalData.delinquentFreeTradePercent = Math.round(totalData.delinquentFreeTradePercent/totalData.loanCount);

  var jsonOutput = {
    grade: gradeData,
    state: stateData,
    total: totalData
  }

  jsonfile.writeFile('./breakdowns.json', jsonOutput);
}


/**
 * Run through each line of CSV and process loan data
 */
lineReader.on('line', function(line) {
  if(count > 2) {
    var data = line.split(',');
    if(data.length == csvKey.length) {
      var loanObj = lineArrayToObj(data);
      aggregateBreakdowns(loanObj);
    }
  } else {
    count++;
  }
});


lineReader.on('close', averageBreakdowns);