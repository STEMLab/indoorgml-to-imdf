const polygonClipping = require('polygon-clipping');

const reveresFlag = true;
function Polygon(coordinates) {
  this.coordinates = coordinates;
  this.properties = {};
}

Polygon.prototype.setProperties = function(properties) {
  this.properties = {
    ...properties,
  };
}

Polygon.prototype.get = function(isReverse) {
  return isReverse === true ? [this.coordinates.map(coordinate => coordinate.reverse())] : [this.coordinates];
}

Polygon.prototype.getGeojson = function(isReverse) {
  return {
    'type': 'Feature',
    'geometry': {
      'type': 'Polygon',
      'coordinates': this.get(isReverse),
    },
    'properties': this.properties
  }
}

function Point(pos) {
  this.x = parseFloat(pos[0]);
  this.y = parseFloat(pos[1]);
  this.z = pos[2] === undefined ? 0 : parseFloat(pos[2]);
}

Point.prototype.get2D = function(isReverse) {
  return isReverse === true ? [this.y, this.x] : [this.x, this.y];
}

Point.prototype.get3D = function(isReverse) {
  return isReverse === true ? [this.y, this.x, this.z] :[this.x, this.y, this.z];
}

Point.prototype.getGeojson = function(isReverse) {
  return {
    'type': 'Feature',
    'geometry': {
      'type': 'Point',
      'coordinates': this.get2D(isReverse),
    },
    'properties': {

    }
  }
}

function CellSpace(cellSpace) {
  const getPolygonFromSurfaces = (surfaces) => {
    const object = {
      coordinates: [],
      minZ: null,
    }
    surfaces[0].map(coordinate => {
      if (object.minZ === null) object.minZ = coordinate[2];
      object.coordinates.push(coordinate.slice(0,2));
    })
    const polygon = new Polygon(object.coordinates);
    polygon.setProperties({
      'floor': object.minZ,
    })

    return polygon;
  }
  const getPartialboundedBy = (partialboundedBy) => {
    if(partialboundedBy === undefined) return null;
    const partialboundedBys = new Array();
    if (Array.isArray(partialboundedBy)) {
      partialboundedBy.map(object => partialboundedBys.push(object._attributes['xlink:href'].replace('#','')));
    } else {
      partialboundedBys.push(partialboundedBy._attributes['xlink:href'].replace('#',''));
    }
    return partialboundedBys;
  }
  const getPolygon = (cellSpace) => {
    const surfaceMembers = cellSpace['core:cellSpaceGeometry']['core:Geometry3D']['gml:Solid']['gml:exterior']['gml:Shell']['gml:surfaceMember'];
    const surfaces = surfaceMembers.map(surfaceMember => {
      const poss = surfaceMember['gml:Polygon']['gml:exterior']['gml:LinearRing']['gml:pos'];
      const surface = poss.map(pos => {          
        return new Point(pos._text.trim().split(' ')).get3D();
      })
      return surface;
    })
    return getPolygonFromSurfaces(surfaces);
  }
  this.id = cellSpace._attributes['gml:id'];
  this.description = cellSpace['gml:description']._text === undefined ? null : cellSpace['gml:description']._text;
  this.name = cellSpace['gml:name']._text;
  this.boundedBy = cellSpace['gml:boundedBy']._attributes['xsi:nil'];
  this.duality = cellSpace['core:duality']._attributes['xlink:href'].replace('#','');
  this.partialboundedBy = getPartialboundedBy(cellSpace['core:partialboundedBy']);
  this.polygon = getPolygon(cellSpace);
}

function State(state) {
  const getPoint = (state) => {
      const pos = state['core:geometry']['gml:Point']['gml:pos']._text.trim().split(' ');
      return new Point(pos);
  }
  this.id = state._attributes['gml:id'];
  this.description = state['gml:description'] === undefined ? null : state['gml:description']._text;
  this.name = state['gml:name'] === undefined ? null : state['gml:name']._text;
  this.boundedBy = state['gml:boundedBy']._attributes['xsi:nil'];
  this.point = getPoint(state);
}

function MBRectangle(eachFloorPolygons) {
  this.mbr = {}

  const getMBR = (polygons) => {
    const mbRectangle = {
      minX: Number.MAX_VALUE,
      minY: Number.MAX_VALUE,
      maxX: Number.MIN_VALUE,
      maxY: Number.MIN_VALUE,
    }

    polygons.map(polygon => {
      polygon.map(coordinate => {
        mbRectangle.minX = mbRectangle.minX < coordinate[0] ? mbRectangle.minX : coordinate[0];
        mbRectangle.minY = mbRectangle.minY < coordinate[1] ? mbRectangle.minY : coordinate[1];
        mbRectangle.maxX = mbRectangle.maxX > coordinate[0] ? mbRectangle.maxX : coordinate[0];
        mbRectangle.maxY = mbRectangle.maxY > coordinate[1] ? mbRectangle.maxY : coordinate[1];
      })
    })

    return [
      [mbRectangle.minX, mbRectangle.maxY],
      [mbRectangle.minX, mbRectangle.minY],
      [mbRectangle.maxX, mbRectangle.minY],
      [mbRectangle.maxX, mbRectangle.maxY],
      [mbRectangle.minX, mbRectangle.maxY]
    ];
  }
  const getTotalMBR = () => {
    const polygons = Object.keys(this.mbr).map(floor => this.mbr[floor]);
    return getMBR(polygons);
  }
  const initial = () => {
    Object.keys(eachFloorPolygons).map(floor => {
      this.mbr[floor] = getMBR(eachFloorPolygons[floor]);
    })
    this.mbr['total'] = getTotalMBR();
  }

  

  initial();
}


function IndoorGeometry(indoorJson) {
  const getCellSpace = (cellSpaceMembers) => {
    const cellSpace = {};
    cellSpaceMembers.map(cellSpaceMember => 
      cellSpace[cellSpaceMember['core:CellSpace']._attributes['gml:id']] = new CellSpace(cellSpaceMember['core:CellSpace']))
    return cellSpace;
  }
  const getState = (spaceLayerMembers) => {
    const state = {};
    if (Array.isArray(spaceLayerMembers)) {
      spaceLayerMembers.map(spaceLayerMember => 
        spaceLayerMember['core:SpaceLayer']['core:nodes']['core:stateMember'].map(stateMember =>{
          const indoorState = new State(stateMember['core:State']);
          if (this.floorToOrdinal[indoorState.point.get3D()[2]] === undefined) this.floorToOrdinal[indoorState.point.get3D()[2]] = null;
          state[indoorState.id] = indoorState;
        })
      )
    } else {
      spaceLayerMembers['core:SpaceLayer']['core:nodes']['core:stateMember'].map(stateMember =>{
        const indoorState = new State(stateMember['core:State']);
        if (this.floorToOrdinal[indoorState.point.get3D()[2]] === undefined) this.floorToOrdinal[indoorState.point.get3D()[2]] = null;
        state[indoorState.id] = indoorState;
      })
    }
    return state;
  }
  const setMappingFloorToOrdinal = () => {
    const floors = Object.keys(this.floorToOrdinal);
    const underFloors = floors.filter(floor => floor < 0).sort((a,b) => parseFloat(b) - parseFloat(a));
    const baseFloors = floors.filter(floor => floor >= 0).sort((a,b) => parseFloat(a) - parseFloat(b));
    underFloors.map((floor, index) => {
      this.floorToOrdinal[floor] = -(index+1);
    })
    baseFloors.map((floor, index) => {
      this.floorToOrdinal[floor] = index;
    })
  }
  const getEachFloorPolygons = (cellSpace) => {
    const eachFloorPolygons = {};
    Object.keys(cellSpace).map(id => {
      const floor = cellSpace[id].polygon.properties.floor;
      if (floor !== undefined && eachFloorPolygons[floor] === undefined) {
        eachFloorPolygons[floor] = new Array();
      }
      eachFloorPolygons[floor] = eachFloorPolygons[floor].concat(cellSpace[id].polygon.get(reveresFlag));
    })

    return eachFloorPolygons;
  }
  const cellSpaceMembers = indoorJson['core:IndoorFeatures']['core:primalSpaceFeatures']['core:PrimalSpaceFeatures']['core:cellSpaceMember'];
  const spaceLayerMembers = indoorJson['core:IndoorFeatures']['core:multiLayeredGraph']['core:MultiLayeredGraph']['core:spaceLayers']['core:spaceLayerMember'];
  this.floorToOrdinal = {}
  this.geometry = {
    cellSpace: getCellSpace(cellSpaceMembers),
    state: getState(spaceLayerMembers),
  }
  this.mbRectangle = null;
  this.polygonOfFloor = {};
  const initial = () => {
    setMappingFloorToOrdinal();
    const eachFloorPolygons = getEachFloorPolygons(this.geometry.cellSpace);

    const hallPolygons = Object.keys(eachFloorPolygons).map(floor => {
      const polygons = eachFloorPolygons[floor].map(coordinates => [coordinates]);
      this.polygonOfFloor[floor] = polygonClipping.union(...polygons);
      return polygons;
    });
    this.polygonOfFloor.total = polygonClipping.union(...hallPolygons.map(coordinates => coordinates));

    this.mbRectangle = new MBRectangle(eachFloorPolygons);
  }
  initial();
}

module.exports = IndoorGeometry;