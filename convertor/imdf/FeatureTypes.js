const { v4: uuidv4 } = require('uuid');
const polylabel = require('polylabel');
const IndoorGeometry = require('../IndoorGeometry');
const reveresFlag = true;

function Feature() {}

Feature.prototype.getFeatureCollection = function(name) {
  return {
    'type': 'FeatureCollection',
    name,
    'features': new Array(),
  }
}

Feature.prototype.getFeatureInformation = function(id, feature_type, geometry) {
  return {
    id,
    'type': 'Feature',
    'feature_type': feature_type,
    'geometry': geometry,
  }
}

Feature.prototype.getGeometry = function(coordinates) {
  return {
    'type': coordinates[0][0].length > 2 ? 'MultiPolygon' : 'Polygon',
    coordinates,
  }
}

Feature.prototype.getDisplayPoint = function(coordinates) {
  return {
    'type': 'Point',
    coordinates,
  }
}

// function FeatureCollection(name) {
//   this.type = 'FeatureCollection';
//   this.name = name;
//   this.features = [];
// }

// function FeatureInformation(id, feature_type, geometry) {
//   this.id = id;
//   this.type = 'Feature';
//   this.feature_type = feature_type;
//   this.geometry = geometry;
// }

// function Geometry(coordinates) {
//   this.type = coordinates[0][0].length > 2 ? 'MultiPolygon' : 'Polygon',
//   this.coordinates = coordinates;
// }

// function DisplayPoint(coordinates) {
//   this.type = 'Point',
//   this.coordinates = coordinates;
// }

function Manifest(language) {
  this.version = '1.0.0';
  this.created = new Date().toISOString();
  this.language = language;
}

function Address() {
  this.address = {
    ... this.getFeatureCollection('address'),
    'features': [
      {
        ... this.getFeatureInformation(uuidv4(), 'address', null),
        'properties' : {
          'address': null,
          'unit': null,
          'locality': null,
          'province': null,
          'country' : null,
          'postal_code' : null,
          'postal_code_ext': null,
      }
      }
    ]
  }
}

Address.prototype = Object.create(Feature.prototype);
Address.prototype.constructor = Address;
Address.prototype.getGeojson = function() {
  return this.address;
}

/*function Venue(mbRectangle, address_id) {
  getFeatures = () => {    
    return [{
      ... new FeatureInformation(uuidv4(), 'venue', new Geometry([mbRectangle.mbr.total])),
			'properties' : {
				'category' : 'university',
				'restriction' : null,
				'name' : {
					'en' : 'venue',
				},
				'alt_name' : null,
				'hours' : null,
				'phone' : null,
				'website' : null,
				'display_point' : {...new DisplayPoint(polylabel([mbRectangle.mbr.total]))},
				'address_id' : address_id
			}
		}];
  }
  
  const venue = {
    ... new FeatureCollection('venue'),
    features: getFeatures(),
  }

  this.getGeojson = () => {
    return venue;
  }
}*/

function Venue(polygonOfFloor, address_id) {
  getFeatures = () => {    
    return [{
      ... this.getFeatureInformation(uuidv4(), 'venue', this.getGeometry(polygonOfFloor.total)),
			'properties' : {
				'category' : 'university',
				'restriction' : null,
				'name' : {
					'en' : 'venue',
				},
				'alt_name' : null,
				'hours' : null,
				'phone' : null,
				'website' : null,
				'display_point' : {...this.getDisplayPoint(polylabel(polygonOfFloor.total[0]))},
				'address_id' : address_id
			}
		}];
  }
  
  this.venue = {
    ... this.getFeatureCollection('address'),
    features: getFeatures(),
  }
}

Venue.prototype = Object.create(Feature.prototype);
Venue.prototype.constructor = Venue;
Venue.prototype.getGeojson = function() {
  return this.venue;
}

/*function Level(mbRectangle, address_id, floorToOrdinal) {
  getFeatures = () => {
    const features = new Array();
    const mbr = mbRectangle.mbr;
    Object.keys(mbr)
      .filter(floor => !floor.includes('total'))
      .map(floor => {
        const feature = {
          ... new FeatureInformation(`level_${floorToOrdinal[floor]}`, 'level', new Geometry([mbr[floor]])),
          'properties' : {
            'category' : 'unspecified',
            'restriction' : null,
            'outdoor' : false,
            'ordinal' : floorToOrdinal[floor],
            'name' : {
              'en' : `Level ${floorToOrdinal[floor]}`
            },
            'short_name' : {
              'en' : `L${floorToOrdinal[floor]}`
            },
            'display_point' : {...new DisplayPoint(polylabel([mbr[floor]]))},
            'address_id' : address_id,
            'building_ids' : null,
          }
        }
        features.push(feature);
      })
    return features;
  }

  const level = {
    ... new FeatureCollection('level'),
    features: getFeatures(),
  }

  this.getGeojson = () => {
    return level;
  }
}*/

function Level(polygonOfFloor, address_id, floorToOrdinal) {
  getFeatures = () => {
    const features = new Array();
    Object.keys(polygonOfFloor)
      .filter(floor => !floor.includes('total'))
      .map(floor => {
        const feature = {
          ... this.getFeatureInformation(`level_${floorToOrdinal[floor]}`, 'level', this.getGeometry(polygonOfFloor[floor])),
          'properties' : {
            'category' : 'unspecified',
            'restriction' : null,
            'outdoor' : false,
            'ordinal' : floorToOrdinal[floor],
            'name' : {
              'en' : `Level ${floorToOrdinal[floor]}`
            },
            'short_name' : {
              'en' : `L${floorToOrdinal[floor]}`
            },
            'display_point' : {...this.getDisplayPoint(polylabel(polygonOfFloor[floor][0]))},
            'address_id' : address_id,
            'building_ids' : null,
          }
        }
        features.push(feature);
      })
    return features;
  }

  this.level = {
    ... this.getFeatureCollection('level'),
    features: getFeatures(),
  }
}

Level.prototype = Object.create(Feature.prototype);
Level.prototype.constructor = Level;
Level.prototype.getGeojson = function() {
  return this.level;
}

function Unit(cellSpace, state, floorToOrdinal) {
  const getFeatures = () => {
    return Object.keys(cellSpace).map(id => {
      return {
        ... this.getFeatureInformation(id, 'unit', this.getGeometry([cellSpace[id].polygon.coordinates])),
        'properties' : {
          'category' : 'room',
          'restriction' : null,
          "accessibility": null,
          'name' : {
            'en' : cellSpace[id]['name'].trim(),
          },
          'display_point' : {...this.getDisplayPoint(state[cellSpace[id].duality].point.get2D(reveresFlag))},
          'level_id' : `level_${floorToOrdinal[cellSpace[id].polygon.properties.floor]}`
      }
    }})
  }
  
  this.unit = {
    ... this.getFeatureCollection('unit'),
    features: getFeatures(),
  }
}

Unit.prototype = Object.create(Feature.prototype);
Unit.prototype.constructor = Unit;
Unit.prototype.getGeojson = function() {
  return this.unit;
}


function FeatureTypes(indoorJson) {
  this.indoorGeometry = new IndoorGeometry(indoorJson);
}

FeatureTypes.prototype.getManifest = function(language) {
  return new Manifest(language);
}

FeatureTypes.prototype.getAddress = function() {
  return new Address().getGeojson();
}

FeatureTypes.prototype.getVenue = function(address_id) {
  return new Venue(this.indoorGeometry.polygonOfFloor, address_id).getGeojson();
}

FeatureTypes.prototype.getLevel = function(address_id) {
  return new Level(this.indoorGeometry.polygonOfFloor, address_id, this.indoorGeometry.floorToOrdinal).getGeojson();
}

FeatureTypes.prototype.getUnit = function() {
  return new Unit(this.indoorGeometry.geometry.cellSpace, this.indoorGeometry.geometry.state, this.indoorGeometry.floorToOrdinal).getGeojson();
}
module.exports = FeatureTypes;