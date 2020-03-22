import {InputField, OutField, KaTeXRender, PlainRender, ASCIIMathRender} from "./fields";

const LanguageRenders = {
    'katex': new KaTeXRender(),
    'plain': new PlainRender(),
    'asciimath': new ASCIIMathRender(),
};

type LanguageType = keyof typeof LanguageRenders;

class LineSnapshot {
    constructor(readonly value?: string,
                readonly type?: LanguageType,
                readonly timestamp = Date.now()) {
    }
}

class NumberBoardData {
    constructor(readonly id: number, readonly data: LineSnapshot) {
    }
}

class LineControls {
    private readonly typeElement: HTMLSelectElement;
    constructor(parent: HTMLElement,
                editable: (editable: boolean)=> boolean,
                render: (engine: LanguageType)=>void) {
        const main = document.createElement('article');
        main.classList.add('board-controls');
        const edit = document.createElement('button');
        edit.textContent = "Редактировать";
        let editState = false;
        editable(editState);
        edit.addEventListener('click', _ => {
            editState = editable(editState = !editState);
            if (editState) {
                edit.textContent = "Перестать редактировать";
            } else {
                edit.textContent = "Редактировать";
            }
        });
        this.typeElement = document.createElement('select');
        for (let render in LanguageRenders) {
            this.typeElement.add(new Option(render, render));
        }
        this.typeElement.addEventListener("change", _ => {
            render(this.type);
        });
        main.append(edit, this.typeElement);
        parent.append(main);
    }
    set type(type: LanguageType) {
        const opts = this.typeElement.options;
        for (let opt, j = 0; opt = opts[j]; j++) {
            if (opt.value == type) {
                this.typeElement.options.selectedIndex = j;
                return;
            }
        }
        alert(`Неизвестный тип рендера ${type}. Попробуйте перезагрузить страницу.`)
    }
    get type(): LanguageType {
        return this.typeElement.options[this.typeElement.selectedIndex].text as LanguageType;
    }
}

class Board {
    private out: OutField;
    private input: InputField;
    private lastState = 0;
    private controls: LineControls;
    constructor(parent: HTMLElement, onchange: () => void) {
        const main = document.createElement('article');
        const header = document.createElement('header');
        const section = document.createElement('section');
        main.append(header, section);
        section.classList.add("board");
        this.input = new InputField(section);
        this.out = new OutField(section);
        this.input.addEventListener('change', ev => {
            this.out.value = ev.text;
            onchange()
        });
        this.controls = new LineControls(header, editable => {
            this.input.visible = editable;
            return editable;
        }, language => {
            this.out.engine = LanguageRenders[language];
            onchange();
        });
        parent.appendChild(main);
    }

    set data(data: LineSnapshot) {
        if (data.timestamp <= this.lastState)
            return;
        if (data.type) {
            this.out.engine = LanguageRenders[data.type];
            this.controls.type = data.type;
        }
        if (data.value)
            this.input.value = this.out.value = data.value;
        this.lastState = data.timestamp;
    }
    get data(): LineSnapshot {
        return new LineSnapshot(this.input.value, this.controls.type)
    }
}

class MultiBoard {
    private boards = new Array<Board>();
    private readonly root: HTMLElement;
    private modified = new Set<number>();
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
        });
        setInterval(() => {
            if (this.modified.size === 0)
                return;
            this.modified.forEach(
                i => socket.send(JSON.stringify(new NumberBoardData(i, this.boards[i].data))));
            this.modified.clear();
        }, 1000/40);
    }

    private addBoard(id: number) {
        this.boards[id] = new Board(this.root, () => {
            this.modified.add(id)
        })
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
//
// setInterval(() => {
//     if (socket.bufferedAmount == 0) {
//         socket.send(moreData());
//     }
// }, 100);