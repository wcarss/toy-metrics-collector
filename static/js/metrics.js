window.onload = async () => {
  const roomName = document.getElementById("roomName").value;
  const metricsResponse = await fetch(`/api/metrics/${roomName}`);
  const metrics = await metricsResponse.json();
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
        tooltip: { content: "data" },
      },
      transform: [
        { calculate: "datum.send_bps/1000", as: "send_kbps" },
        { calculate: "datum.recv_bps/1000", as: "recv_kbps" },
      ],
      encoding: {
        x: {
          field: "timestamp",
          type: "temporal",
          title: "time",
        },
        y: {
          field: { repeat: "layer" },
          type: "quantitative",
          title: "send+recv kbps, send+rec packet loss %",
        },
        shape: {
          datum: { repeat: "layer" },
          type: "nominal",
        },
        strokeDash: {
          datum: { repeat: "layer" },
          type: "nominal",
        },
        color: { field: "session_id", type: "nominal" },
      },
    },
  };

  // eslint-disable-next-line no-undef
  vegaEmbed("#vis", vegaSpec);
};
