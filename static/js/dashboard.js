window.onload = () => {
  const reload = () => window.location.reload();

  const createRoom = async () => {
    fetch("/api/rooms", { method: "POST" }).then(reload);
  };

  // every deletion button needs its own action handler
  const registerDeleteRoom = (deleteRoomElement) => {
    const roomName = deleteRoomElement.id.split("-")[2];
    const deleteRoom = () => {
      fetch(`/api/rooms/${roomName}`, {
        method: "DELETE",
      }).then(reload);
    };
    deleteRoomElement.addEventListener("click", deleteRoom);
  };

  const deleteRoomElements = document.getElementsByClassName("deleteRoom");
  for (const deleteRoomElement of deleteRoomElements) {
    registerDeleteRoom(deleteRoomElement);
  }
  document.getElementById("createRoom").addEventListener("click", createRoom);
};
