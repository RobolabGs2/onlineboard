import {Board} from "./board";
import {ColorThemesPanel} from "./style";
import {Themes} from "./themes";

const header = document.body.getElementsByTagName('header')[0];
new ColorThemesPanel(header, Themes);

let boardId = window.location.pathname.split("/").pop();
if (!boardId)
    throw 'Impossible';
const url = `ws://${window.location.host}/board/${boardId}/socket`;
const socket = new WebSocket(url);
const board = new Board(document.body, boardId);

socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено", e);
});

socket.addEventListener("message", function (event) {
    console.log(event.data);
    const data = JSON.parse(event.data);
    if (!data) {
        console.error(`WTF from server: ${event.data}`);
        return
    }
    board.update(data);
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
}, 1000 / 40);