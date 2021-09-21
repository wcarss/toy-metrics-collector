window.onload = async () => {
  // hacky way of passing the room-name value from the template:
  const roomName = document.getElementById("roomName").value;
  const metricsResponse = await fetch(`/api/metrics/${roomName}`);
  const metrics = await metricsResponse.json();

  // vega-list is a graphing library, see https://vega.github.io/vega-lite/
  const vegaSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "call quality data",
    // awful dynamic width hack for now
    width: window.innerWidth * 0.4,
    data: { values: metrics },
    repeat: {
      layer: ["send_kbps", "recv_kbps", "send_packet_loss", "recv_packet_loss"],
    },
    spec: {
      mark: {
        type: "line",
        // enables per-point tooltips that show the data at that point
        tooltip: { content: "data" },
      },
      // kbps seems easier to reason about than bps, which we store
      transform: [
        { calculate: "datum.send_bps/1000", as: "send_kbps" },
        { calculate: "datum.recv_bps/1000", as: "recv_kbps" },
      ],
      encoding: {
        // dynamically chooses a scale given the start/end timestamps
        // (the labels could likely be configured better for consistency)
        x: {
          field: "timestamp",
          type: "temporal",
          title: "time",
        },
        // iterates over the fields in the 'repeat.layer' array above
        y: {
          field: { repeat: "layer" },
          type: "quantitative",
          title: "send+recv kbps, send+rec packet loss %",
        },
        // the shape of the points changes per data field
        shape: {
          datum: { repeat: "layer" },
          type: "nominal",
        },
        // the stroke of the lines also changes per data field
        strokeDash: {
          datum: { repeat: "layer" },
          type: "nominal",
        },
        // the colour is chosen per session_id, or participant
        color: { field: "session_id", type: "nominal" },
      },
    },
  };

  // vegaEmbed is not declared in our code, so eslint should ignore it:
  // eslint-disable-next-line no-undef
  vegaEmbed("#vis", vegaSpec);
};
