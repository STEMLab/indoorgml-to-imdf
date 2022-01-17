const fs = require('fs');
const FeatureTypes = require('./imdf/FeatureTypes');

function createFile(data, name, extension) {
  if (!fs.existsSync('./output')){
    fs.mkdirSync('./output');
  }
  fs.writeFile(`./output/${name}.${extension}`,JSON.stringify(data),'utf-8',() => console.log(name, 'file has been created.'))
}

function ImdfCreator(indoorJson) {
  this.feature = new FeatureTypes(indoorJson);
}

ImdfCreator.createImdfFiles = (indoorJson) => {
  const imdfCreator = new ImdfCreator(indoorJson);
  imdfCreator.createManifestJson('en');
  const address_id = imdfCreator.createAddressGeoJson();
  imdfCreator.createVenueGeoJson(address_id);
  const ordinal_level_id = imdfCreator.createLevelGeoJson(address_id);
  imdfCreator.createUnitGeoJson(ordinal_level_id);
}

ImdfCreator.prototype.createManifestJson = function(language){
  const manifest = this.feature.getManifest(language);
  createFile(manifest, 'manifest', 'json');
}

ImdfCreator.prototype.createAddressGeoJson = function(){
  const address = this.feature.getAddress();
  createFile(address, 'address', 'geojson');
  return address.features[0].id;
}

ImdfCreator.prototype.createVenueGeoJson = function(address_id){
  const venue = this.feature.getVenue(address_id);
  createFile(venue, 'venue', 'geojson');
}

ImdfCreator.prototype.createLevelGeoJson = function(address_id){
  const level = this.feature.getLevel(address_id);
  createFile(level, 'level', 'geojson');
  const ordinal_level_id = {};
  level.features.map(feature => ordinal_level_id[feature.properties.ordinal] = feature.id);
  return ordinal_level_id;
}

ImdfCreator.prototype.createUnitGeoJson = function(){
  const unit = this.feature.getUnit();
  createFile(unit, 'unit', 'geojson');
}

module.exports = ImdfCreator;