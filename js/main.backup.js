//creates the map
function createMap(){
//defines the starting point and zoom level of the map
    var map = L.map('map', {
        center: [20, 0],
        zoom: 2

    });
//imports the tile layer from the defined source
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    getData(map);
};
//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    console.log(attribute);
    //create marker options
    var options = {
        fillColor: "#003153",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    //build popup content string
    var popupContent = "<p><b>Country:</b> " + feature.properties.Track_Name + "</p>";
    //var year = attribute.split("yr_")[1];
    popupContent += "<p><b>Renewable Energy Production in " + year + ":</b> " + feature.properties[attribute] + " quadrillion BTU's</p>";
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
    var scaleFactor = 125;
    var area = attValue * scaleFactor;
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};
//sequence controls
function createSequenceControls(map, attributes){
    $('#panel').append('<input class="range-slider" type="range">');
    $('#panel').append('<button class="skip" id="reverse">Back</button>');
    $('#panel').append('<button class="skip" id="forward">Skip</button>');
    $('#reverse').html('<img src="img/Reverse.png">');
    $('#forward').html('<img src="img/Forward.png">');

    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    });

    //click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };
        //update slider
        $('.range-slider').val(index);
        //input listener for slider
        $('.range-slider').on('input', function(){
            //sequence
            var index = $(this).val();
            updatePropSymbols(map, attributes[index]);
        });
        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });
};
//updates propsymbols based on attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);
            var popupContent = "<p><b>Country:</b> " + props.Track_Name + "</p>";
            var year = attribute.split("yr_")[1];
            popupContent += "<p><b>Renewable Energy Production in " + year + ":</b> " + props[attribute] + " quadrillion BTU's</p>";
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius)
            });
            updateLegend(map, attribute);
        };
    });
};
//Create map legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
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
				svg += '<circle class="legend-circle" id="' + circle + '" fill="#003153" fill-opacity="0.8" stroke="#000000" cx="30"/>';

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

	updateLegend(map, attributes[0]);
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

//Update the legend with new attribute
function updateLegend(map, attribute){
	//create content for legend
	var year = attribute.split("yr_")[1];
	var content = "Produced in " + year;

	//replace legend content
	$('#temporal-legend').html(content);

	//get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

	for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        $('#'+key).attr({
            cy: 59 - radius,
            r: radius
        });

        //Step 4: add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " P BTU's");
    };

};

//Processing data fields and attributes
function processData(data){
    var attributes = [];
    var properties = data.features[0].properties;

    for (var attribute in properties){
        if (attribute.indexOf("yr_") > -1){
            attributes.push(attribute);
        };
    };
    console.log(attributes);
    return attributes;
};
//Grab all the data and creat and apply functions
function getData(map){
    $.ajax("data/track_info.geojson", {
        dataType: "json",
        success: function(response){

            var attributes = processData(response);
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map,attributes)
        }
    });
};
//engages the createMap when the document has finished loading
$(document).ready(createMap);
