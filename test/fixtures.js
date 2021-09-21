const roomsFixtures = [
  {
    id: "69afe457-7070-43f4-80a2-b76adb667567",
    name: "test_room_1",
    api_created: true,
    privacy: "public",
    url: "https://wcarss.daily.co/test_room_1",
    created_at: "2021-01-01T00:00:00:000Z",
    config: {},
  },
  {
    id: "69afe457-7070-43f4-80a2-b76adb667568",
    name: "test_room_2",
    api_created: true,
    privacy: "public",
    url: "https://wcarss.daily.co/test_room_2",
    created_at: "2021-01-01T00:00:00:000Z",
    config: {},
  },
];

const metricsFixtures = [
  {
    id: 20,
    room_name: roomsFixtures[0].name,
    session_id: "347b0c44-f0f9-4960-d67d-614a6b145453",
    timestamp: 1632084654630,
    send_bps: 0,
    recv_bps: 0,
    send_packet_loss: 0,
    recv_packet_loss: 0,
  },
  {
    id: 21,
    room_name: roomsFixtures[0].name,
    session_id: "347b0c44-f0f9-4960-d67d-614a6b145453",
    timestamp: 1632084670633,
    send_bps: 1009023.43,
    recv_bps: 1010731.12,
    send_packet_loss: 0,
    recv_packet_loss: 0,
  },
];

module.exports = { metricsFixtures, roomsFixtures };
