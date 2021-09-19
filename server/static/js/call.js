const captureMetrics = (callFrame, roomName, participantId) => {
  return async () => {
    const metrics = await callFrame.getNetworkStats();
    const metricsPayload = {
      room_name: roomName,
      session_id: participantId,
      timestamp: metrics.stats.latest.timestamp,
      send_bps: metrics.stats.latest.videoSendBitsPerSecond.toFixed(2),
      recv_bps: metrics.stats.latest.videoRecvBitsPerSecond.toFixed(2),
      send_packet_loss: metrics.stats.latest.videoSendPacketLoss.toFixed(3),
      recv_packet_loss: metrics.stats.latest.videoRecvPacketLoss.toFixed(3),
    };
    fetch("/api/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metricsPayload),
    });
  };
};

window.onload = async () => {
  const metricsRate = 15000; // capture every 15 seconds

  // daily.js is already loaded from call.html
  const dailyElement = document.getElementById("daily_holder");
  const roomURLElement = document.getElementById("room_url");
  const roomURL = roomURLElement.value;
  const callFrame = await window.DailyIframe.createFrame(dailyElement);
  await callFrame.join({ url: roomURL });
  const participantId = await callFrame.participants().local.session_id;
  const room = await callFrame.room();

  setInterval(captureMetrics(callFrame, room.name, participantId), metricsRate);
};
