let paramsObj = {
  searchValue: "agg_max",
  datasetCodeValue: "COPERNICUS/S2_SR",
  selectedBandValue: "NDVI",
  startDateValue: "2021-09-01",
  endDateValue: "2021-09-10",
  imageScaleValue: 250,
  geometryValue: JSON.stringify({ "type": "FeatureCollection", "features": [{ "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [[[19.51171875, 4.214943141390651], [18.28125, -4.740675384778361], [26.894531249999996, -4.565473550710278], [27.24609375, 1.2303741774326145], [19.51171875, 4.214943141390651]]] } }] }),
};

let searchParams = new URLSearchParams(paramsObj);

console.log(searchParams.toString())

fetch('http://localhost:4000', {
  method: 'POST',
  headers:{
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    searchValue: "agg_max",
    datasetCodeValue: "COPERNICUS/S2_SR",
    selectedBandValue: "NDVI",
    startDateValue: "2021-09-01",
    endDateValue: "2021-09-10",
    imageScaleValue: 250,
    geometryValue: { "type": "FeatureCollection", "features": [{ "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [[[19.51171875, 4.214943141390651], [18.28125, -4.740675384778361], [26.894531249999996, -4.565473550710278], [27.24609375, 1.2303741774326145], [19.51171875, 4.214943141390651]]] } }] },
  })
}).then(res => res.json()).then(data => console.log(data))

