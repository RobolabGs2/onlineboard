import {Board} from "./board";

const url = `ws://${window.location.host}/socket/${window.location.pathname.split("/").pop()}`;
const socket = new WebSocket(url);
const board = new Board(document.body);

socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено", e);
});

socket.addEventListener("message", function (event) {
    board.update(JSON.parse(event.data));
});

socket.addEventListener("close", function (event) {
    if (event.wasClean) {
        console.log(`[close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
    } else {
        // например, сервер убил процесс или сеть недоступна
        // обычно в этом случае event.code 1006
        alert('[close] Соединение прервано');
        console.error(`[close] Соединение закрыто, код=${event.code} причина=${event.reason}`);
    }
});

socket.addEventListener("error", function (error) {
    alert(error);
    console.error(error);
});

setInterval(() => {
    if (socket.bufferedAmount === 0) {
        board.changes().forEach(x => socket.send(JSON.stringify(x)));
    }
}, 1000/40);