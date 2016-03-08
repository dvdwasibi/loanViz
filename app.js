
var myApp = angular.module('LoanViz',[]);

myApp.controller('MainController', ['$scope', '$http', function($scope, $http) {
  var mapViz;
  var breakdownData;
  var colorMapping = {
    loanCount: '#02386F',
    avgIncome: '#219E60',
    pastDelinquencyPercent: '#BF1F1F'
  }

  $scope.mapOptions = [
    {
      key: 'loanCount',
      name: 'Loan Volume',
    },
    {
      key: 'avgIncome',
      name: 'Average Income'
    },
    {
      key: 'pastDelinquencyPercent',
      name: 'Past Delinquency Rate'
    },
  ]
  $scope.currentMapKey = 'loanCount';
  $scope.selectedState = null;
  $scope.distributionStats = null;


  $scope.selectMapView = function(option) {
    $scope.currentMapKey = option.key;
    mapViz.updateChoropleth(generateMapData());
  }


  /**
   * Generate color fills based on current map mode
   */
  function generateMapData() {
    var stateData = breakdownData.state;
    var mapData = {};

    var max = Number.NEGATIVE_INFINITY;
    var min = Number.POSITIVE_INFINITY;
    _.forOwn(stateData, function(data) {
      if(data[$scope.currentMapKey] > max) {
        max = data[$scope.currentMapKey];
      }
      if(data[$scope.currentMapKey] < min) {
        min = data[$scope.currentMapKey];
      }
    });

    var paletteScale = d3.scale.linear()
      .domain([
        $scope.distributionStats[$scope.currentMapKey].min,
        $scope.distributionStats[$scope.currentMapKey].max
      ])
      .range(["#EFEFEF",colorMapping[$scope.currentMapKey]]);

    _.forOwn(stateData, function(data, stateID) {
      var fill;
      if(data.loanCount === 0) {
        fill = '#FFF';
      } else {
        fill = paletteScale(data[$scope.currentMapKey]);
      }
      mapData[stateID] = {
        fillColor: fill,
      }
      mapData[stateID][$scope.currentMapKey] = data[$scope.currentMapKey];
    });
    return mapData;
  };


  /**
   * Initialize chart and bind to #map_viz container
   */
  function initChart() {
    mapViz = new Datamap({
      scope: 'usa',
      element: document.getElementById('map_viz'),
      fills: { defaultFill: '#FFF' },
      geographyConfig: {
        highlightBorderColor: '#bada55',
        popupTemplate: function(geo, data) {
          $scope.$apply(function() {
            $scope.selectedState = breakdownData.state[geo.id]
            $scope.selectedState.name  = geo.properties.name;
          });
        },
        highlightBorderWidth: 2,
        highlightFillColor: function(geo) {
          return geo['fillColor'] || '#FFF';
        },
      },
      data: generateMapData()
    });
    mapViz.labels();
  }


  /**
   * Preprocess data to retrieve distributions and min/max
   */
  function calculateDistributions() {
    var distributionStats = {};
    var keys = ['loanCount', 'avgIncome', 'pastDelinquencyPercent'];
    var stateArray = [];
    _.forOwn(breakdownData.state, function(state, stateID) {
      state.id = stateID;
      stateArray.push(state);
    });

    keys.forEach(function(key) {
      var sortedArray = _.sortBy(stateArray, function(state) {
        return state[key];
      });
      var median = sortedArray[25][key];
      var max = Number.NEGATIVE_INFINITY;
      var min = Number.POSITIVE_INFINITY;
      stateArray.forEach(function(state) {
        if(state.loanCount) {
          if(state[key] > max) {
            max = state[key];
          }
          if(state[key] < min) {
            min = state[key];
          }
        }
      })

      var medianLocation = (median-min)/(max-min);
      distributionStats[key] = {
        median: median,
        min: min,
        max: max,
        medianLocation: medianLocation
      }

      stateArray.forEach(function(state) {
        if(!state.distributionLocation) {
          state.distributionLocation = {};
        }
        if(state.loanCount) {
          state.distributionLocation[key] = (state[key]-min) / (max-min);
        } else {
          state.distributionLocation[key] = 0;
        }

      })
    });
    $scope.distributionStats = distributionStats;
  }


  /**
   * Initial Data JSON Fetch
   */
  $http.get('/breakdowns.json')
    .success(function(response) {
      breakdownData = response;
      calculateDistributions();
      initChart();
    });
}]);






