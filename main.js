var serverIP = 'localhost';
var geoserverPort = 'localhost:8082';
var geoserverWorkspace = 'GIS';

var projectionName = 'EPSG:3857';
var layerList = [];
var activeLayerName;
var editGeoJSON;
var modifiedFeatureList = [];
var editTask;
var modifiedFeature = false;
var modifyInteraction;
var featureAdd;
var snap_edit;
var pointFeature;
var bufferedExtent;

var mapView = new ol.View({
    center: [4154046.374051165, -365594.36299231404],
    zoom: 12
});

var map = new ol.Map({
    target: 'map',
    view: mapView,
    controls: []
});
// start : auto locate function

var intervalAutolocate;
var posCurrent;

var geolocation = new ol.Geolocation({
    trackingOptions: {
        enableHighAccuracy: true,
    },
    tracking: true,
    projection: mapView.getProjection()
});

var positionFeature = new ol.Feature();
positionFeature.setStyle(
    new ol.style.Style({
        image: new ol.style.Circle ({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC',
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2,
            }),
        }),
    })
);
var accuracyFeature = new ol.Feature();

var currentPositionLayer = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [accuracyFeature, positionFeature],
    }),
});

function startAutolocate() {
    var coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    mapView.setCenter(coordinates);
    mapView.setZoom(16);
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    intervalAutolocate = setInterval(function () {
        var coordinates = geolocation.getPosition();
        var accuracy = geolocation.getAccuracyGeometry()
        positionFeature.setGeometry(coordinates ? new ol.geom.point(coordinates) : null);
        map.getView().setCenter(coordinates);
        mapView.setZoom(16);
        accuracyFeature.setGeometry(accuracy);
    }, 1000);
}

function stopAutocate() {
    clearInterval(intervalAutolocate);
    positionFeature.setGeometry(null);
    accuracyFeature.setGeometry(null);
}
// end : auto locate functions

geolocation.on('change:position', function (evt) {
    pointFeature = new ol.Feature({
        geometry: new ol.geom.Point(geolocation.getPosition()),
    });
    if (bufferedExtent) {
        if (ol.extent.containsXY(bufferedExtent, pointFeature.getGeometry().getCoordinates()[0], pointFeature.getGeometry().getCoordinates()[1])) {

        } else {
            bufferedExtent = new ol.extent.buffer(pointFeature.getGeometry().getExtent(), 1000);
            map.setView(
                new ol.View({
                    center: geolocation.getPosition(),
                    extent: bufferedExtent,
                    zoom: 12
                })
            );
        }
    } else {
        bufferedExtent = new ol.extent.buffer(pointFeature.getGeometry().getExtent(), 1000);
            map.setView(
                new ol.View({
                    center: geolocation.getPosition(),
                    extent: bufferedExtent,
                    zoom: 12
                })
            );
    }
});




var querySelectedFeatureStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(64,244,208,0.4)',
    }),
    stroke: new ol.style.Stroke({
        color: '#40E0D0',
        width: 3,
    }),
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: '#40E0D0'
        })
    })
});

var querySelectedFeatureOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: querySelectedFeatureStyle
});

var clickSelectedFeatureStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255,255,0,0.4)',
    }),
    stroke: new ol.style.Stroke({
        color: '#FFFF00',
        width: 3,
    }),
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: '#FFFF00'
        })
    })
});
var clickSelectedFeatureOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: clickSelectedFeatureStyle
});

var interactionStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(200, 200, 200, 0.6)',
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
    }),
    image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
    })
});

var imgTile = new ol.layer.Tile({
    title: 'World Imagery',
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    }),
    type: 'base',
    visible: false
});

var osmTile = new ol.layer.Tile({
    title: 'Open Street Map',
    type: 'base',
    visible: true,
    attributions: '',
    source: new ol.source.OSM()
});

var noneTile = new ol.layer.Tile({
    title: 'None',
    type: 'base',
    visible: false
});

var baseGroup = new ol.layer.Group({
    title: 'Base Maps',
    fold: 'close',
    layers: [imgTile, osmTile, noneTile]
});

// start : adding landbase layers
var bldTile = new ol.layer.Tile({
    title: 'Building',
    source: new ol.source.TileWMS({
        url: 'http://localhost:8082/geoserver/GIS/wms',
        params: { 'LAYERS': 'GIS:bld', 'TILED': true },
        serverType: 'geoserver',
        visible: true
    }),
});

var lmTile = new ol.layer.Tile({
    title: 'Landmark',
    source: new ol.source.TileWMS({
        url: 'http://localhost:8082/geoserver/GIS3/wms',
        params: { 'LAYERS': 'GIS3:points', 'TILED': true },
        serverType: 'geoserver',
        transition: 0,
    }),
});

var rcTile = new ol.layer.Tile({
    title: 'Roads',
    source: new ol.source.TileWMS({
        url: 'http://localhost:8082/geoserver/GIS2/wms',
        params: { 'LAYERS': 'GIS2:network', 'TILED': true },
        serverType: 'geoserver',
        transition: 0,
    }),
});

var znTile = new ol.layer.Tile({
    title: 'Zones',
    source: new ol.source.TileWMS({
        url: 'http://localhost:8082/geoserver/GIS4/wms',
        params: { 'LAYERS': 'GIS4:zones', 'TILED': true },
        serverType: 'geoserver',
        transition: 0,
    }),
});

var lyamungoTile = new ol.layer.Tile({
    title: 'Customer',
    source: new ol.source.TileWMS({
        url: 'http://localhost:8082/geoserver/lyamungo/wms',
        params: { 'LAYERS': 'lyamungo:lyamungods', 'TILED': true },
        serverType: 'geoserver',
        transition: 0,
    }),
});

var lbLayer = new ol.layer.Group({
    title: 'Landbase',
    fold: 'close',
    visible: false,
    layers: [rcTile, lmTile, bldTile, znTile, lyamungoTile]
});
// end : adding landbase layers

map.addLayer(baseGroup);
map.addLayer(lbLayer);

for (y = 0; y < map.getLayers().getLength(); y++) {
    var lyr1 = map.getLayers().item(y)
    if (lyr1.get('title') == 'Base Maps') { } else {
        if (lyr1.getLayers().getLength() > 0) {
            for (z = 0; z < lyr1.getLayers().getLength(); z++) {
                var lyr2 = lyr1.getLayers().item(z);
                layerList.push(lyr2.getSource().getParams().LAYERS);
            }
        } else {
            layerList.push(lyr1.getSource().getParams().LAYERS);
        }
    }
}

var layerSwitcher = new ol.control.LayerSwitcher({
    tipLabel: 'Show Layers', // Optional label for button
    collapseTipLabel: 'Hide Layers', // Optional label for button
    groupSelectStyle: 'group' // Can be 'children' [default], 'group' or 'none'
});
map.addControl(layerSwitcher);

$("#spanLatLong").html(ol.proj.toLonLat(map.getView().getCenter())[1].toFixed(6) + ", " + ol.proj.toLonLat(map.getView().getCenter())[0].toFixed(6));
$("#spanAccuracy").html("");

var onPointerMoveMap = function (e) {
    $("#spanLatLong").html(ol.proj.toLonLat(map.getView().getCenter())[1].toFixed(6) + ", " + ol.proj.toLonLat(map.getView().getCenter())[0].toFixed(6));
};


// handle geolocation error.
geolocation.on('error', function (error) {
    alert(error.message);
});

// general functions
function openSubScreen(scrn) {
    $(".modal").hide();
    $("#" + scrn).show();
}

function addMapLayerList(selectElementName) {
    var select = $("#" + selectElementName);
    select.empty()
    select.append("<option class='ddindent' value=''></option>");

    for (i = 0; i < layerList.length; i++) {
        var value = layerList[i];
        select.append("<option class='ddindent' value='" + value + "'>" + value + "</option>");
    }
}

function newaddGeoJsonToMap(url) {
    if (queryGeoJSON) {
        queryGeoJSON.getSource().clear();
        map.removeLayer(queryGeoJSON);
    }

    queryGeoJSON = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: querySelectedFeatureStyle,

    });

    queryGeoJSON.getSource().on('addfeature', function () {
        map.getView().fit(
            queryGeoJSON.getSource().getExtent(),
            { duration: 1590, size: map.getSize(), maxZoom: 21 }
        );
    });
    map.addLayer(queryGeoJSON);
}

var drawInteraction;
function addFeature(evt) {
    if (clickSelectedFeatureOverlay) {
        clickSelectedFeatureOverlay.getSource().clear();
        map.removeLayer(clickSelectedFeatureOverlay);
    }

    if (modifyInteraction) {
        map.removeInteraction(modifyInteraction);
    }
    if (snap_edit) {
        map.removeInteraction(snap_edit);
    }

    // var interactionType;
    source_mod = editGeoJSON.getSource();
    drawInteraction = new ol.interaction.Draw({
        source: editGeoJSON.getSource(),
        type: editGeoJSON.getSource().getFeatures()[0].getGeometry().getType(),
        style: interactionStyle
    });
    map.addInteraction(drawInteraction);
    snap_edit = new ol.interaction.Snap({
        source: editGeoJSON.getSource()
    });
    map.addInteraction(snap_edit);

    drawInteraction.on('drawend', function (e) {
        var feature = e.feature;
        feature.set('geometry', feature.getGeometry());
        modifiedFeatureList.push(feature);

        var featureProperties = editGeoJSON.getSource().getFeatures()[0].getProperties();
        document.getElementById('attributeContainer').innerHTML = '';
        for (var key in featureProperties) {
            if (featureProperties.hasOwnProperty(key)) {
                if (key != 'geometry') {
                    if (key != 'id') {
                        var div = document.createElement('div')
                        div.className = 'mb-3';

                        var lbl = document.createElement('label')
                        lbl.className = 'form-label';
                        lbl.innerHTML = key;

                        var inputBox = document.createElement('input');
                        inputBox.className = 'form-control';
                        inputBox.id = key;
                        inputBox.value = '';

                        div.appendChild(lbl);
                        div.appendChild(inputBox);

                        document.getElementById('attributeContainer').appendChild(div);
                    }
                }
            }
        }
        openSubScreen("attributeUpdate");

    })

}

var selInterFeatUpd;
var clones = [];

function saveEdits (editTaskName) {
    clones = [console.log('okay')];
    for (var i = 0; i < modifiedFeatureList.length; i++) {
        var feature = modifiedFeatureList[i];
        var featureProperties = feature.getProperties();

        delete featureProperties.boundedBy;
        var clone = feature.clone();
        clone.setId(feature.getId());

        clones.push(clone)
    }

    if (editTaskName == 'update') { transactWFS('update_batch', clones); }
    if (editTaskName == 'insert') { transactWFS('insert_batch', clones); }
}

var formatWFS = new ol.format.WFS();
var transactWFS = function (mode, f) {
    var node;
    var formatGML = new ol.format.GML({
        featureNS: geoserverWorkspace,
        featureType: activeLayerName,
        service: 'WFS',
        version: '1.1.0',
        request: 'GetFeature',
        srsName: 'EPSG:3857'
    });
    switch (mode) {
        case 'insert':
            node = formatWFS.writeTransaction([f], null, null, formatGML);
            break;
        case 'insert_batch':
            node = formatWFS.writeTransaction(f, null, null, formatGML);
            break;
        case 'update':
            node = formatWFS.writeTransaction(null, [f], null, formatGML);
            break;
        case 'update_batch':
            node = formatWFS.writeTransaction(null, f, null, formatGML);
            break;
        case 'delete':
            node = formatWFS.writeTransaction(null, null, [f], formatGML);
            break;
        case 'delete_batch':
            node = formatWFS.writeTransaction(null, null, [f], formatGML);
            break;
    }
    var xs = new XMLSerializer();
    var payload = xs.serializeToString(node);

    payload = payload.split('feature:' + activeLayerName).join(activeLayerName);
    if (editTask == 'insert') { payload = payload.split(geoserverWorkspace + ':geometry').join(geoserverWorkspace + ':the_geom'); }
    if (editTask == 'update') { payload = payload.split('<Name>geometry</Name>').join('<Name>the_geom</Name>'); }
    if (editTask == 'updateAttribute') { payload = payload.split('<Name>geometry</Name>').join('<Name>the_geom</Name>'); }

    $.ajax('http://localhost:8082/geoserver/wfs', {
        type: 'POST',
        dataType: 'xml',
        processData: false,
        contentType: 'text/xml',
        data: payload.trim(),
        success: function (data) {
        },
        error: function (e) {
            var errorMsg = e ? (e.status + ' ' + e.statusText) : "";
            alert('Error saving this feature to GeoServer.<br><br>'
                + errorMsg);
        }
    }).done(function () {

        editGeoJSON.getSource().refresh();

    });
};

var selInterAttUpd;
selInterAttUpd = new ol.interaction.Select({ style: clickSelectedFeatureStyle });

selInterAttUpd.on('select', function (e) {
    if (e.target.getFeatures().getLength() > 0) {
        var featureProperties = e.target.getFeatures().item(0).getProperties();
        modifiedFeatureList.push(e.target.getFeatures().item(0));
        document.getElementById('attributeContainer').innerHTML = '';
        for (var key in featureProperties) {
            if (featureProperties.hasOwnProperty(key)) {
                if (key != 'the_geom') {
                    if (key != 'id') {
                        var div = document.createElement('div')
                        div.className = 'mb-3';

                        var lbl = document.createElement('label')
                        lbl.className = 'form-label';
                        lbl.innerHTML = key;

                        var inputBox = document.createElement('input');
                        inputBox.className = 'form-control';
                        inputBox.id = key;
                        inputBox.value = featureProperties[key];

                        div.appendChild(lbl);
                        div.appendChild(inputBox);

                        document.getElementById('attributeContainer').appendChild(div);
                    }
                }
            }
        }
        openSubScreen("attributeUpdate");
    }

});

var selInterDelFeat;
selInterDelFeat = new ol.interaction.Select({ style: clickSelectedFeatureStyle });

selInterDelFeat.on('select', function (e) {
    setTimeout(function () {
        if (selFeat) {
            var answer = confirm('Do you want to delete selected feature?');
            if (answer) {
                var featureProperties = selFeat.getProperties();
                delete featureProperties.boundedBy;
                var clone = selFeat.clone();
                clone.setId(selFeat.getId());
                transactWFS('delete', clone);
            }
        }
    }, 10);
    var selFeat = e.target.getFeatures().item(0);
});


// start : Length and area measurement
var continuePolygonMsg = 'Click to continue polygon, Double click to complete';
var continueLineMsg = 'Click to continue line, Double click to complete';

var draw;

var source = new ol.source.Vector();
var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2,
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33',
            }),
        }),
    }),
});

map.addLayer(vector);

function addInteraction(intType) {

    draw = new ol.interaction.Draw({
        source: source,
        type: intType,
        style: interactionStyle
    });
    map.addInteraction(draw);

    createMeasureTooltip();
    createHelpTooltip();

    var sketch;
    var pointerMoveHandler = function (evt) {
        if (evt.dragging) {
            return;
        }
        var helpMsg = 'Click to start drawing';
        if (sketch) {
            var geom = sketch.getGeometry();

        }
    };

    map.on('pointermove', pointerMoveHandler);

    draw.on('drawstart', function (evt) {
        sketch = evt.feature;
        var tooltipCoord = evt.coordinate;
        sketch.getGeometry().on('change', function (evt) {
            var geom = evt.target;
            var output;
            if (geom instanceof ol.geom.Polygon) {
                output = formatArea(geom);
                tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof ol.geom.LineString) {
                output = formatLength(geom);
                tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
        });
    });

    draw.on('drawend', function () {
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
        measureTooltip.setOffset([0, -7]);
        sketch = null;
        measureTooltipElement = null;
        createMeasureTooltip();
    });
}

var helpTooltipElement;
var helpTooltip;

function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'ol-tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left',
    });
    map.addOverlay(helpTooltip);
}

var measureTooltipElement;
var measureTooltip;

function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center',
    });
    map.addOverlay(measureTooltip);
}

var formatLength = function (line) {
    var length = ol.sphere.getLength(line);
    var output;
    if (length > 100) {
        output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
    } else {
        output = Math.round(length * 100) / 100 + ' ' + 'm';
    }
    return output;
};

var formatArea = function (polygon) {
    var area = ol.sphere.getArea(polygon);
    var output;
    if (area > 10000) {
        output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
    } else {
        output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
    }
    return output;
};

// end : Length and area measurement

// onload functions
$(function () {

    map.on('pointerdrag', onPointerMoveMap);

    //adding map layer list to active layer selection
    addMapLayerList("selLayers");

    $("#btnStartEditing").attr("disabled", true);
    $("#btnAddFeature").attr("disabled", true);
    $("#btnModifyFeature").attr("disabled", true);
    $("#btnModifyAttribute").attr("disabled", true);
    $("#btnDeleteFeature").attr("disabled", true);

    //click event for settings button
    $("#btnSettings").click(function () {
        openSubScreen("divSettings");

    });

    //     //click event for map button
    $("#btnMap").click(function () {
        openSubScreen();
    });

    //click event for start editing button
    $("#btnStartEditing").click(function () {
        openSubScreen();
        $("#btnStartEditing").toggleClass("clicked");
        if ($("#btnStartEditing").hasClass("clicked")) {
            var style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(0, 0, 0, 0)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#00FFFF', //'rgba(0, 0, 0, 0)',
                    width: 3
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#00FFFF' //'rgba(0, 0, 0, 0)'
                    })
                })
            });

            if (editGeoJSON) {
                editGeoJSON.getSource().clear();
                map.removeLayer(editGeoJSON);
            }

            editGeoJSON = new ol.layer.Vector({
                title: "Edit Layer",
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON(),
                    url: function (extent) {
                        return 'http://localhost:8082/geoserver/wfs'   + '/ows?services=WFS&' +
                            'version=1.0.0&request=GetFeature&typeName=' + activeLayerName + '&' +
                            'outputFormat=application/json&srsname=EPSG:3857&' +
                            'bbox=' + extent.join(',') + ',EPSG:3857';
                    },
                    strategy: ol.loadingstrategy.bbox
                }),
                style: style,
            });
            map.addLayer(editGeoJSON);
            $("#btnAddFeature").attr("disabled", false);
            $("#btnModifyFeature").attr("disabled", false);
            $("#btnModifyAttribute").attr("disabled", false);
            $("#btnDeleteFeature").attr("disabled", false);
        } else {
            if (modifiedFeatureList.length > 0) {
                var answer = confirm('Save edits?');
                if (answer) {
                    saveEdits(editTask);
                    modifiedFeatureList = [];
                } else {
                    modifiedFeatureList = [];
                }
            }

            if ($("#btnAddFeature").hasClass("clicked")) { $("#btnAddFeature").toggleClass("clicked"); }
            $("#btnAddFeature").attr("disabled", true);
            if ($("#btnModifyFeature").hasClass("clicked")) { $("#btnModifyFeature").toggleClass("clicked"); }
            $("#btnModifyFeature").attr("disabled", true);
            if ($("#btnModifyAttribute").hasClass("clicked")) { $("#btnModifyAttribute").toggleClass("clicked"); }
            $("#btnModifyAttribute").attr("disabled", true);
            if ($("#btnDeleteFeature").hasClass("clicked")) { $("#btnDeleteFeature").toggleClass("clicked"); }
            $("#btnDeleteFeature").attr("disabled", true);

            if ($("#btnGroupCapture").is(":visible")) { $('#btnGroupCapture').toggle(); }

            editGeoJSON.getSource().clear();
            map.removeLayer(editGeoJSON);
            modifiedFeature = false;
            map.removeInteraction(modifyInteraction);
            map.removeInteraction(snap_edit);
            map.removeInteraction(selInterAttUpd);
            map.removeInteraction(drawInteraction);
            editTask = '';
        }
    });

    //click event for start editing button
    $("#btnAddFeature").click(function () {
        openSubScreen();
        $("#btnAddFeature").toggleClass("clicked");
        if ($("#btnAddFeature").hasClass("clicked")) {
            $("#btnModifyFeature").attr("disabled", true);
            $("#btnModifyAttribute").attr("disabled", true);
            $("#btnDeleteFeature").attr("disabled", true);

            openSubScreen();

            if (modifiedFeatureList) {
                if (modifiedFeatureList.length > 0) {
                    var answer = confirm('Do you want to save edits?');
                    if (answer) {
                        saveEdits(editTask);
                        modifiedFeatureList = [];
                    } else {
                        modifiedFeatureList = [];
                    }

                }
            }
            editTask = 'insert';
            map.removeInteraction(drawInteraction);
            addFeature();
        } else {
            $("#btnModifyFeature").attr("disabled", false);
            $("#btnModifyAttribute").attr("disabled", false);
            $("#btnDeleteFeature").attr("disabled", false);
            map.removeInteraction(drawInteraction);
        }
    });

    //click event for modify feature button
    $("#btnModifyFeature").click(function () {
        editTask = 'update';
        openSubScreen();
        $("#btnModifyFeature").toggleClass("clicked");
        if ($("#btnModifyFeature").hasClass("clicked")) {
            $("#btnAddFeature").attr("disabled", true);
            $("#btnModifyAttribute").attr("disabled", true);
            $("#btnDeleteFeature").attr("disabled", true);

            modifiedFeatureList = [];
            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }

            selInterFeatUpd = new ol.interaction.Select({ style: clickSelectedFeatureStyle });
            map.addInteraction(selInterFeatUpd);

            modifyInteraction = new ol.interaction.Modify({
                features: selInterFeatUpd.getFeatures(),
            });
            map.addInteraction(modifyInteraction);

            var sourceEditGeoJson = editGeoJSON.getSource();
            snap_edit = new ol.interaction.Snap({
                source: sourceEditGeoJson
            });
            map.addInteraction(snap_edit);
            modifyInteraction.on('modifyend', function (e) {
                modifiedFeature = true;
                featureAdd = true;
                if (modifiedFeatureList.length > 0) {

                    for (var j = 0; j < modifiedFeatureList.length; j++) {
                        if (e.features.item(0)['id_'] == modifiedFeatureList[j]['id_']) {
                            featureAdd = false;
                        }
                    }
                }
                if (featureAdd) { modifiedFeatureList.push(e.features.item(0)); }
            })

            selInterFeatUpd.on('select', function (e) {
                if (modifiedFeatureList.length > 0) {
                    var featureProperties = modifiedFeatureList[0].getProperties();
                    document.getElementById('attributeContainer').innerHTML = '';
                    for (var key in featureProperties) {
                        if (featureProperties.hasOwnProperty(key)) {
                            if (key != 'geometry') {
                                if (key != 'id') {
                                    var div = document.createElement('div')
                                    div.className = 'mb-3';

                                    var lbl = document.createElement('label')
                                    lbl.className = 'form-label';
                                    lbl.innerHTML = key;

                                    var inputBox = document.createElement('input');
                                    inputBox.className = 'form-control';
                                    inputBox.id = key;
                                    inputBox.value = featureProperties[key];

                                    div.appendChild(lbl);
                                    div.appendChild(inputBox);

                                    document.getElementById('attributeContainer').appendChild(div);
                                }
                            }
                        }
                    }
                    openSubScreen("attributeUpdate");
                }
            })
        } else {
            $("#btnAddFeature").attr("disabled", false);
            $("#btnModifyAttribute").attr("disabled", false);
            $("#btnDeleteFeature").attr("disabled", false);
            if (modifiedFeatureList.length > 0) {
                var answer = confirm('Do you want to save edits?');
                if (answer) {
                    saveEdits(editTask);
                    modifiedFeatureList = [];
                } else {
                    modifiedFeatureList = [];
                }
            }
            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }
            modifiedFeature = false;
            map.removeInteraction(selInterFeatUpd);
            map.removeInteraction(modifyInteraction);
            map.removeInteraction(snap_edit);

            if (selInterFeatUpd) {
                map.removeInteraction(selInterFeatUpd);
            }

            if (modifyInteraction) {
                map.removeInteraction(modifyInteraction);
            }
            if (snap_edit) {
                map.removeInteraction(snap_edit);
            }
            if (drawInteraction) {
                map.removeInteraction(drawInteraction);
            }
            editTask = '';
        }
    });


    //click event for modify attribute button
    $("#btnModifyAttribute").click(function () {
        openSubScreen();
        $("#btnModifyAttribute").toggleClass("clicked");
        if ($("#btnModifyAttribute").hasClass("clicked")) {
            $("#btnAddFeature").attr("disabled", true);
            $("#btnModifyFeature").attr("disabled", true);
            $("#btnDeleteFeature").attr("disabled", true);

            modifiedFeatureList = [];
            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }

            map.addInteraction(selInterAttUpd);
            editTask = 'updateAttribute';
        } else {
            $("#btnAddFeature").attr("disabled", false);
            $("#btnModifyFeature").attr("disabled", false);
            $("#btnDeleteFeature").attr("disabled", false);
            if (modifiedFeatureList.length > 0) {
                var answer = confirm('Save edits?');
                if (answer) {
                    saveEdits(editTask);
                    modifiedFeatureList = [];
                } else {
                    modifiedFeatureList = [];
                }
            }

            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }

            modifiedFeature = false;
            map.removeInteraction(modifyInteraction);
            map.removeInteraction(snap_edit);
            map.removeInteraction(selInterAttUpd);
            editTask = '';
        }
    });

    //click event for delete feature button
    $("#btnDeleteFeature").click(function () {
        openSubScreen();
        $("#btnDeleteFeature").toggleClass("clicked");
        if ($("#btnDeleteFeature").hasClass("clicked")) {
            $("#btnAddFeature").attr("disabled", true);
            $("#btnModifyAttribute").attr("disabled", true);
            $("#btnModifyFeature").attr("disabled", true);
            modifiedFeatureList = [];
            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }
            editTask = 'delete';
            map.addInteraction(selInterDelFeat);
        } else {
            $("#btnAddFeature").attr("disabled", false);
            $("#btnModifyAttribute").attr("disabled", false);
            $("#btnModifyFeature").attr("disabled", false);
            if (modifiedFeatureList.length > 0) {
                var answer = confirm('You have unsaved edits. Do you want to save edits?');
                if (answer) {
                    saveEdits(editTask);
                    modifiedFeatureList = [];
                } else {
                    modifiedFeatureList = [];
                }
            }
            map.removeInteraction(selInterDelFeat);
            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }
            modifiedFeature = false;
            editTask = '';
        }
    });

    //click event for onscreen add feature button
    $("#btnCaptureOnScreen").click(function () {
        openSubScreen();
        $("#btnCaptureOnScreen").toggleClass("clicked");
        if ($("#btnCaptureOnScreen").hasClass("clicked")) {

            if (modifiedFeatureList) {
                if (modifiedFeatureList.length > 0) {
                    var answer = confirm('Save edits?');
                    if (answer) {
                        saveEdits(editTask);
                        modifiedFeatureList = [];
                    } else {
                        modifiedFeatureList = [];
                    }

                }
            }
            editTask = 'insert';
            addFeature();
        } else {

            if (modifiedFeatureList.length > 0) {
                var answer = confirm('You have unsaved edits. Do you want to save edits?');
                if (answer) {
                    saveEdits(editTask);
                    modifiedFeatureList = [];
                } else {
                    modifiedFeatureList = [];
                }
            }

            if (clickSelectedFeatureOverlay) {
                clickSelectedFeatureOverlay.getSource().clear();
                map.removeLayer(clickSelectedFeatureOverlay);
            }
            modifiedFeature = false;
            map.removeInteraction(modifyInteraction);
            map.removeInteraction(snap_edit);
            editTask = '';

            if (modifyInteraction) {
                map.removeInteraction(modifyInteraction);
            }
            if (snap_edit) {
                map.removeInteraction(snap_edit);
            }
            if (drawInteraction) {
                map.removeInteraction(drawInteraction);
            }
        }
    });

    //on change event for autolocate slider
    $("#numAutolocate").on("change", function () {
        $("#valAutolocate").html($("#numAutolocate").val());
        clearInterval(intervalAutolocate);
        if (!$("#btnCrosshair").hasClass("clicked")) {
            startAutolocate();
        }
    });

    $('#selLayers').on('change', function () {
        activeLayerName = $('#selLayers').find(":selected").text();
        var tempURL = 'http://localhost:8082/geoserver/wfs' + activeLayerName + '&maxFeatures=5&outputFormat=application/json&srsname=EPSG:3857';
        $.getJSON(tempURL, function (data) {
            activeLayerGeometry = data.features[0].geometry.type;
        });

        if (activeLayerName != '') {
            $('#spanActiveLayer').html('Active Layer - ' + activeLayerName);
            $("#btnStartEditing").attr("disabled", false);
            if (editGeoJSON) {
                editGeoJSON.getSource().clear();
                map.removeLayer(editGeoJSON);
            }
            if ($("#btnStartEditing").hasClass("clicked")) {
                $("#btnStartEditing").toggleClass("clicked");
            }
            if (drawInteraction) {
                map.removeInteraction(drawInteraction);
            }

        } else {
            if (editGeoJSON) {
                editGeoJSON.getSource().clear();
                map.removeLayer(editGeoJSON);
            }
            if ($("#btnStartEditing").hasClass("clicked")) {
                $("#btnStartEditing").toggleClass("clicked");
            }
            $('#spanActiveLayer').html('Active Layer - Not set');
            $("#btnStartEditing").attr("disabled", true);
            $("#btnAddFeature").attr("disabled", true);
            $("#btnModifyFeature").attr("disabled", true);
            $("#btnModifyAttribute").attr("disabled", true);
            $("#btnDeleteFeature").attr("disabled", true);
            map.removeInteraction(drawInteraction)
        }
    });

    //click event for atrribute cancel button
    $("#btnCancel").click(function () {
        $('#attributeContainer').html('');
        openSubScreen();
        modifiedFeatureList = [];
        if (editTask != 'updateAttribute') { editGeoJSON.getSource().refresh(); }
    });

    //click event for atrribute save button
    $("#btnSave").click(function () {
        clones = [console.log("okay")];

       var feature = modifiedFeatureList[0];
       var featureProperties = feature.getProperties();
       console.log(featureProperties);
        delete featureProperties.boundedBy;
        $('#attributeContainer').children().each(function () {
          featureProperties[this.children[1].id] = this.children[1].value
        });
        var clone = feature.clone();
        clone.setId(feature.getId());
        clone.setProperties(featureProperties);

        clones.push(clone)
        if (editTask == 'insert') {
        transactWFS('insert', clone);
       } else {
          transactWFS('update', clone);
       }


        modifiedFeatureList = [];
        openSubScreen();
    });

    //click event for measure length button
    $("#btnMeasureLength").click(function () {
        $("#btnMeasureLength").toggleClass("clicked");
        if ($("#btnMeasureLength").hasClass("clicked")) {
            map.removeInteraction(draw);
            addInteraction('LineString');
        } else {
            map.removeInteraction(draw);
            source.clear();
            const elements = document.getElementsByClassName("ol-tooltip ol-tooltip-static");
            while (elements.length > 0) elements[0].remove();
        }
    });
});
 
// Live Location
$("#btnCrosshair").on("click", function(_event) {
    $("#btnCrosshair").toggleClass("clicked");
    if ($("#btnCrosshair").hasClass("clicked")) {
        startAutolocate();
    } else {
        stopAutocate();
    }
});   

