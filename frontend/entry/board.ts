import './board.css'
import {Board, StorageKeyGenerator} from "../common/board";
import {ColorThemesPanel} from "../common/style";
import {Themes} from "../common/themes";
import {HttpBoardHandler} from "../common/communication/boardhandler"

const header = document.body.getElementsByTagName('header')[0];
new ColorThemesPanel(header, Themes);

let boardId = window.location.pathname.split("/").pop();
if (!boardId)
    throw 'Impossible';
const url = `ws://${window.location.host}/board/${boardId}/socket`;
const socket = new WebSocket(url);
const board = new Board(document.body, new HttpBoardHandler(boardId), new StorageKeyGenerator(boardId));
socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено", e);
});

const footer = document.createElement('footer');
const button = document.createElement('button');
button.textContent = "Получить json";
button.addEventListener('click', () => alert(JSON.stringify(board)));
footer.append(button);
document.body.append(footer);

socket.addEventListener("message", function (event) {
    const data = JSON.parse(event.data);
    if (!data) {
        console.error(`WTF from server: ${event.data}`);
        return
    }
    try {
        board.update(data);
    }catch (e) {
        console.error(`error for update '${event.data}': ${e}`);
    }
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