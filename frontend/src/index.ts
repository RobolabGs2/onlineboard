import {InputField, OutField} from "./fields";

type LanguageType = 'katex' | 'markdown' | 'plain'

class BoardSnapshot {
    constructor(readonly value: string = "\KaTeX",
                readonly type: LanguageType = 'katex',
                readonly timestamp = Date.now()) {
    }
}

class NumberBoardData {
    constructor(readonly id: number, readonly data: BoardSnapshot) {
    }
}

class Board {
    private out: OutField;
    private input: InputField;
    private lastState = 0;

    constructor(parent: HTMLElement, onchange: (data: BoardSnapshot) => void) {
        const main = document.createElement('article');
        main.classList.add("board");
        this.input = new InputField(main);
        this.out = new OutField(main);
        this.input.addEventListener('change', ev => {
            let snapshot = new BoardSnapshot(ev.text);
            this.lastState = snapshot.timestamp;
            onchange(snapshot)
        });
        parent.appendChild(main);
    }

    set data(data: BoardSnapshot) {
        if (data.timestamp < this.lastState)
            return;
        this.input.value = this.out.value = data.value;
        this.lastState = data.timestamp;
    }
}

class MultiBoard {
    private boards = new Array<Board>();
    private root: HTMLElement;

    constructor(parentElem: HTMLElement) {
        this.root = document.createElement('article');
        this.addBoard(0);
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                if (ev.key === "Enter") {
                    this.addBoard(this.boards.length)
                }
            }
        })
    }

    private addBoard(id: number) {
        this.boards.push(new Board(this.root, data => {
            socket.send(JSON.stringify(new NumberBoardData(id, data)));
        }))
    }

    update(data: NumberBoardData) {
        let board = this.boards[data.id];
        if (board) {
            board.data = data.data;
            return;
        }
        this.addBoard(data.id);
        this.update(data);
    }
}

let path = window.location.pathname.split("/");
let url = `ws://${window.location.host}/socket/${path.pop()}`;
let socket = new WebSocket(url);
const board = new MultiBoard(document.body);

socket.addEventListener("open", function (e) {
    console.log("[open] Соединение установлено");
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
//
// setInterval(() => {
//     if (socket.bufferedAmount == 0) {
//         socket.send(moreData());
//     }
// }, 100);