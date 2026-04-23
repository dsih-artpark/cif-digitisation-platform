function makeRing(centerLon, centerLat, lonDelta, latDelta) {
  return [
    [centerLon - lonDelta, centerLat - latDelta * 0.08],
    [centerLon - lonDelta * 0.42, centerLat - latDelta],
    [centerLon + lonDelta * 0.58, centerLat - latDelta * 0.76],
    [centerLon + lonDelta, centerLat - latDelta * 0.02],
    [centerLon + lonDelta * 0.76, centerLat + latDelta * 0.94],
    [centerLon - lonDelta * 0.04, centerLat + latDelta * 0.84],
    [centerLon - lonDelta * 0.88, centerLat + latDelta * 0.36],
    [centerLon - lonDelta, centerLat - latDelta * 0.08],
  ];
}

function makeFeature({ taluka, code, centerLon, centerLat, lonDelta, latDelta }) {
  return {
    type: "Feature",
    properties: {
      district: "Gadchiroli",
      taluka,
      censusCode: code,
      center: [centerLon, centerLat],
    },
    geometry: {
      type: "Polygon",
      coordinates: [makeRing(centerLon, centerLat, lonDelta, latDelta)],
    },
  };
}

export const gadchiroliTalukaGeoJson = {
  type: "FeatureCollection",
  features: [
    makeFeature({
      taluka: "Sironcha",
      code: "04063",
      centerLon: 79.9629367451065,
      centerLat: 18.850266790352045,
      lonDelta: 0.18,
      latDelta: 0.14,
    }),
    makeFeature({
      taluka: "Desaiganj (Vadasa)",
      code: "04052",
      centerLon: 79.95934342018964,
      centerLat: 20.59989662705614,
      lonDelta: 0.17,
      latDelta: 0.12,
    }),
    makeFeature({
      taluka: "Armori",
      code: "04053",
      centerLon: 79.98728764880434,
      centerLat: 20.46564997400833,
      lonDelta: 0.17,
      latDelta: 0.12,
    }),
    makeFeature({
      taluka: "Chamorshi",
      code: "04058",
      centerLon: 79.89093093334003,
      centerLat: 19.94203622301668,
      lonDelta: 0.18,
      latDelta: 0.13,
    }),
    makeFeature({
      taluka: "Dhanora",
      code: "04056",
      centerLon: 80.30647674091028,
      centerLat: 20.273739881300848,
      lonDelta: 0.17,
      latDelta: 0.12,
    }),
    makeFeature({
      taluka: "Bhamragad",
      code: "04061",
      centerLon: 80.58760256242624,
      centerLat: 19.4084158770132,
      lonDelta: 0.19,
      latDelta: 0.14,
    }),
    makeFeature({
      taluka: "Aheri",
      code: "04062",
      centerLon: 80.00463832015792,
      centerLat: 19.412463301402866,
      lonDelta: 0.19,
      latDelta: 0.14,
    }),
    makeFeature({
      taluka: "Gadchiroli",
      code: "04057",
      centerLon: 80.00639607164065,
      centerLat: 20.18556124889341,
      lonDelta: 0.18,
      latDelta: 0.13,
    }),
    makeFeature({
      taluka: "Kurkheda",
      code: "04054",
      centerLon: 80.2031989993569,
      centerLat: 20.618495262540865,
      lonDelta: 0.17,
      latDelta: 0.12,
    }),
    makeFeature({
      taluka: "Korchi",
      code: "04055",
      centerLon: 80.46915736557851,
      centerLat: 20.71198902349646,
      lonDelta: 0.17,
      latDelta: 0.12,
    }),
    makeFeature({
      taluka: "Mulchera",
      code: "04059",
      centerLon: 79.99630637852407,
      centerLat: 19.67469300955952,
      lonDelta: 0.18,
      latDelta: 0.13,
    }),
    makeFeature({
      taluka: "Etapalli",
      code: "04060",
      centerLon: 80.23447038206977,
      centerLat: 19.600977307722403,
      lonDelta: 0.18,
      latDelta: 0.13,
    }),
  ],
};
