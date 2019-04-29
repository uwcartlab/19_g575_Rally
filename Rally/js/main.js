//creates the map
function createMap(){
//defines the starting point and zoom level of the map
    var map = L.map('map', {
        center: [20, 20],
        zoom: 2.5


    });
//imports the tile layer from the defined source
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    getData(map);
};
// // //function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[2];
    //create marker options
    var options = {
        fillColor: "#8dbe2d",
        color: "#000",
        weight: 2,
        opacity: 1,
        fillOpacity: .9
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    // build popup content string
    var popupContent = "<b>Event:</b> " + feature.properties.Track_Name + "";
    // var name = attribute["Track_Name"];
    popupContent += "<br><b>Years active: </b>" + feature.properties[attribute] + " years</br>";
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius)
    });
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};
//function to calculate the radius of the circles based on the attribute value
function calcPropRadius(attValue) {
    var scaleFactor = 25;
    var area = attValue * scaleFactor;
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};
//Create map legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

			//object to base loop on...replaces Example 3.10 line 1
			var circles = {
				max: 20,
				mean: 40,
				min: 60
			};

			//loop to add each circle and text to svg string
			for (var circle in circles){
				//circle string
				svg += '<circle class="legend-circle" id="' + circle + '" fill="#8dbe2d" fill-opacity="0.8" stroke="#000000" cx="30"/>';

				//text string
				svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
			};

			//close svg string
			svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());

	updateLegend(map, attributes[2]);
};


//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};
//
// //Update the legend with new attribute
function updateLegend(map, attribute){
	//create content for legend
	var content = "<b>Years Active</b>";

	//replace legend content
	$('#temporal-legend').html(content);

	//get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

	for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        $('#'+key).attr({
            cy: 50 - radius,
            r: radius
        });

        //Step 4: add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " Years");
    };

};
//
// //Processing data fields and attributes
function processData(data){
    var attributes = [];
    var properties = data.features[0].properties;

    for (var attribute in properties){
        attributes.push(attribute);
    };
    return attributes;
};
// //Grab all the data and creat and apply functions
function getData(map){
    $.ajax("data/track_info.geojson", {
        dataType: "json",
        success: function(response){

            var attributes = processData(response);
            createPropSymbols(response, map, attributes);
            //createSequenceControls(map, attributes);
            createLegend(map,attributes)
        }
    });
    map.setMaxBounds(map.getBounds());
    map._layersMinZoom=3
};
//engages the createMap when the document has finished loading
$(document).ready(createMap);
