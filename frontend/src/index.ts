class ChangeEvent {
    constructor(public readonly text: string | any) {
    }
}

interface InputFiledEventMap {
    "change": ChangeEvent
}

class InputField {
    private readonly elem: HTMLTextAreaElement;
    private onchange = new Array<(this: this, ev: ChangeEvent) => void>();
    constructor(parent: HTMLElement) {
        this.elem = document.createElement('textarea');
        this.elem.addEventListener("input", ev => {
            console.log(ev);
            this.onchange.forEach(x => x.bind(this)(new ChangeEvent(this.elem.value)));
        });
        parent.appendChild(this.elem)
    }
    addEventListener<K extends keyof InputFiledEventMap>(type: K, listener: (this: this, ev: InputFiledEventMap[K]) => void): number {
        switch (type) {
            case "change":
                return this.onchange.push(listener) - 1;
            default:
                throw `${type} cannot listen for InputField`;
        }
    }
}

function component(text: string) {
    const element = document.createElement('textarea');
    element.disabled = true;
    element.innerHTML = text;
    return element;
}

let url = `ws://${window.location.host}/socket`;
let socket = new WebSocket(url);
const iii = new InputField(document.body).addEventListener("change", ev => {
    socket.send(JSON.stringify(ev.text));
});

socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено");
});

let output = component(url);
document.body.appendChild(output);
socket.addEventListener("message", function (event) {
    output.innerText = event.data;
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
//
// setInterval(() => {
//     if (socket.bufferedAmount == 0) {
//         socket.send(moreData());
//     }
// }, 100);