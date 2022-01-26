const fs = require('fs');
const convert = require('xml-js');
const ImdfCreator = require('./convertor/ImdfCreator');

exports.convert = function(indoorGmlUrl) {
  try {
    indoorGML = fs.readFileSync( indoorGmlUrl, 'utf8');
  } catch (err) {
    console.error(err);
  }

  const indoorJson = convert.xml2js(indoorGML, {compact: true, spaces: 2});
  ImdfCreator.createImdfFiles(indoorJson);
}

// exports.convert = function(indoorGML) {
//   const indoorJson = convert.xml2js(indoorGML, {compact: true, spaces: 2});
//   ImdfCreator.createImdfFiles(indoorJson);
// }