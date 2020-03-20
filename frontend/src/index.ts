import * as _ from 'lodash';

function component(text: string) {
    const element = document.createElement('div');
    element.innerHTML = text;
    return element;
}

let url = `ws://${window.location.host}/socket`;
document.body.appendChild(component(url));
let socket = new WebSocket(url);

socket.addEventListener("open", function(e) {
    alert("[open] Соединение установлено");
    socket.send("Привет!");
    window.addEventListener("keydown", (ev) => {
        socket.send(ev.key)
    })
});

socket.addEventListener("message", function(event) {
    document.body.appendChild(component(event.data));
});

socket.addEventListener("close", function(event) {
    if (event.wasClean) {
        alert(`[close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
    } else {
        // например, сервер убил процесс или сеть недоступна
        // обычно в этом случае event.code 1006
        alert('[close] Соединение прервано');
    }
});

socket.addEventListener("error", function(error) {
    alert(error);
    console.error(error);
});
//
// setInterval(() => {
//     if (socket.bufferedAmount == 0) {
//         socket.send(moreData());
//     }
// }, 100);