import * as katex from 'katex';

class ChangeEvent {
    constructor(public readonly text: string | any) {
    }
}

interface RenderEngine {
    render(text: string, where: HTMLElement): void;
}

class KaTeXRender implements RenderEngine{
    render(text: string, where: HTMLElement): void {
        katex.render(text, where, {
            output: "html", throwOnError: false,
        });
    }
}

class OutField {
    private _renderer: RenderEngine;
    private _value: string;
    private readonly outputContainer: HTMLElement;
    constructor(parentNode: HTMLElement, render: RenderEngine = new KaTeXRender()) {
        this._renderer = render;
        parentNode.appendChild(this.outputContainer = document.createElement('article'));
    }
    set engine(render: RenderEngine) {
        this._renderer = render;
        this.render();
    }
    set value(text: string) {
        this._value = text;
        this.render();
    }
    private render() {
        this._renderer.render(this._value, this.outputContainer);
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
        let art = document.createElement('article');
        art.appendChild(this.elem);
        parent.appendChild(art)
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

let url = `ws://${window.location.host}/socket`;
let socket = new WebSocket(url);
const iii = new InputField(document.body).addEventListener("change", ev => {
    socket.send(JSON.stringify(ev.text));
});

socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено");
});

let output = new OutField(document.body);
socket.addEventListener("message", function (event) {
    output.value = JSON.parse(event.data);
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