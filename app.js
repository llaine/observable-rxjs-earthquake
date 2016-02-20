/* 
First : the imperative way.
We create an observable which flow async datas.
*/
function imperativeWay() {
  var quakes = Rx.Observable.create(function(observer) {
  // JSONP callback
    window.eqfeed_callback = function(response) {
      var quakes = response.features;
      quakes.forEach(function(quake) {
        observer.onNext(quake);
      });
    };

    loadJSONP(QUAKE_URL);
  });
  // We don't care about the async flows or about specific logic to handle thoses async datas. 
  // Just subscribe and that's it! 
  quakes.subscribe(function(quake) {
    var coords = quake.geometry.coordinates;
    var size = quake.properties.mag * 10000;

    L.circle([coords[1], coords[0]], size).addTo(map);
  });
}

/*
Second : less imperative way.
We are no longer managing the flow anymore. No loops or conditionnals 
to extract the individual earthquake objects and pass them around. 
*/
function lessImperativeWay() {
  var quakes = Rx.Observable.create(function(observer) {
  window.eqfeed_callback = function(response) {
    observer.onNext(response); 
    observer.onCompleted(); 
  };

  loadJSONP(QUAKE_URL);
  }).flatMap(function transform(dataset) { 
    return Rx.Observable.from(dataset.response.features); 
  });


  // We don't care about the async flows or about specific logic to handle thoses async datas. 
  // Just subscribe and that's it! 
  quakes.subscribe(function(quake) {
    var coords = quake.geometry.coordinates;
    var size = quake.properties.mag * 10000;

    L.circle([coords[1], coords[0]], size).addTo(map);
  });
}

/**
* Third way, using RxDom that among others, allow us to handle JSONP requests. 
* This help us not used nasty global functions (such as before with eqfeed_callback)
*/
function usingRxDom() {
  var quakes = Rx.DOM.jsonpRequest({
    url: QUAKE_URL,
    jsonpCallback: 'eqfeed_callback'
  })
  .flatMap(function(result) {
    return Rx.Observable.from(result.response.features);
  })
  .map(function(quake) {
    return {
      lat: quake.geometry.coordinates[1],
      lng: quake.geometry.coordinates[0],
      size: quake.properties.mag * 10000
    };
  });
  quakes.subscribe(function(quake) {
    L.circle([quake.lat, quake.lng], quake.size).addTo(map);
  });
}

/**
* "Real time" version using interval. 
* This one 
*/
function realTime() {
  var quakes = Rx.Observable
    .interval(5000)
    // Notice how we use flatMap to retrieve the data of the JsonPRequest.
    // We retung a new Observable, to not break the flow. 
    .flatMap(function() {
      return Rx.DOM.jsonpRequest({
        url: QUAKE_URL,
        jsonpCallback: 'eqfeed_callback'
      }).retry(3); // We retry to try again in case there are problems retrieving the list at first. 
    })
    .flatMap(function(result) {
      return Rx.Observable.from(result.response.features);
    })
    // In order to avoid duplicate, we distinct the datas. 
    .distinct(function(quake) { return quake.properties.code; });

  quakes.subscribe(function(quake) {
    var coords = quake.geometry.coordinates;
    var size = quake.properties.mag * 10000;

    L.circle([coords[1], coords[0]], size).addTo(map);
  });
}

realTime();