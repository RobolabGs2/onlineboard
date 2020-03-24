import {Line, LineSnapshot} from "./line";
import {SVGPictures} from "./svg";

type LineID = number | string;

class LineUpdate {
    constructor(readonly id: LineID,
                readonly value: LineSnapshot,
                readonly number?: number) {
    }
}

class ClickableSVGButton {
    private readonly button = document.createElement('button');

    constructor(parentNode: HTMLElement, svg: string, onclick: () => void) {
        this.button.innerHTML = svg;
        this.button.addEventListener('click', onclick);
        parentNode.append(this.button);
    }

    set visible(visible: boolean) {
        this.button.style.display = visible ? "" : "none";
    }
    click() {
        this.button.click();
    }
}

class LineControls {
    private readonly delButton: ClickableSVGButton;
    private editState = true;
    constructor(parent: HTMLElement,
                private readonly editable: (editable: boolean) => boolean,
                del: () => void) {
        const main = document.createElement('article');
        main.classList.add('line-controls');
        new ClickableSVGButton(main, SVGPictures.Edit, () => {
            this.edit = !this.editState;
        });
        this.delButton = new ClickableSVGButton(main, SVGPictures.Delete, del);
        parent.append(main);
    }

    set edit(editable: boolean) {
        if (editable === this.editState) {
            return
        }
        this.delButton.visible = this.editState = this.editable(editable);
    }
}

class LineInBoard {
    private readonly section = document.createElement('section');
    private readonly controls: LineControls;
    public readonly line: Line;

    constructor(main: HTMLElement, idBoard: string, idLine: LineID, order: number,
                onchange: (id: LineID) => void,
                onfocus?: (id: LineID) => void) {
        const article = document.createElement('article');
        article.classList.add('line');
        const header = document.createElement('header');
        const storageKey = [idBoard, idLine].join('/');
        this.controls = new LineControls(header, editable => {
            const state = this.line.editable = editable;
            localStorage.setItem(storageKey, JSON.stringify(state));
            return state;
        }, () => {
            fetch(`/board/${idBoard}/line/${idLine}`, {method: 'DELETE'})
                .catch(e => alert(e));
        });
        const lineSection = document.createElement('section');
        this.line = new Line(lineSection, onchange.bind(null, idLine));
        this.controls.edit = JSON.parse(localStorage.getItem(storageKey) || "false");
        article.append(header, lineSection);
        this.section.append(article);
        this.section.addEventListener('focus', () => {
            console.log(idLine);
            // TODO
        });
        this.order = order;
        main.append(this.section);
    }

    set order(order: number) {
        if (this.section.style.order !== order.toString()) {
            console.log(order);
            const tabIndex = Math.max(1, order);
            // this.section.tabIndex = tabIndex;
            ['button', 'input', 'select', 'textarea'].forEach(selector => this.section
                .querySelectorAll(selector)
                .forEach((el) => {
                    console.log(el);
                    (el as HTMLElement).tabIndex = tabIndex;
                }));
            this.section.style.order = order.toString()
        }
    }

    get order(): number {
        return Number.parseInt(this.section.style.order);
    }

    focus() {
        this.section.scrollIntoView(true);
    }

    delete() {
        this.section.remove();
    }

    set edit(b: boolean) {
        this.controls.edit = b;
    }
}

function Exists<T>(maybe: T | null | undefined): Promise<T> {
    if (maybe)
        return Promise.resolve(maybe);
    return Promise.reject('is null');
}

export class Board {
    private lines = new Map<LineID, LineInBoard>();
    private readonly root: HTMLElement;
    private modified = new Set<LineID>();
    private lastLine: LineID = "";

    constructor(parentElem: HTMLElement, private readonly id: string) {
        this.root = document.createElement('article');
        this.root.classList.add('board');
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                if (ev.key === "Enter") {
                    Exists(this.lines.get(this.lastLine)).then(line => {
                        line.edit = false;
                        return fetch(`/board/${id}/line`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                parent: this.lastLine,
                                value: new LineSnapshot("", line.line.type)
                            })
                        })
                    }).then(value => value.text())
                        .then(id => {
                            const newLine = this.lines.get(id);
                            if (!newLine)
                                throw 'Trouble this new line ' + id;
                            newLine.edit = true;
                            newLine.focus();
                        })
                        .catch(e => alert(e));
                }
            }
        });
    }

    private addLine(id: LineID, number: number = Number.MAX_SAFE_INTEGER): LineInBoard {
        let lineInBoard = new LineInBoard(this.root, this.id, id, number, this.modified.add.bind(this.modified));
        this.lines.set(id, lineInBoard);
        return lineInBoard
    }

    changes(): Array<LineUpdate> {
        const res = new Array<LineUpdate>();
        this.modified.forEach(i => {
            const line = this.lines.get(i);
            if (line)
                res.push(new LineUpdate(i, line.line.data))
        });
        this.modified.clear();
        return res
    }

    update(data: LineUpdate) {
        let boardLine = this.lines.get(data.id);
        if (!boardLine) {
            if (data.number === -1)
                return;
            boardLine = this.addLine(data.id, data.number);
        }
        if (data.number) {
            if (data.number === -1) {
                boardLine.delete();
                this.lines.delete(data.id);
                let number = 0;
                if (this.lastLine === data.id) {
                    this.lines.forEach((value, key) => {
                        if (value.order > number) {
                            number = value.order;
                            this.lastLine = key;
                        }
                    })
                }
                return;
            }
            // TODO: error check
            let lastline = this.lines.get(this.lastLine) || boardLine;
            if (lastline.order < data.number) {
                this.lastLine = data.id;
            }
            boardLine.order = data.number;
        }
        if (data.value)
            boardLine.line.data = data.value;
    }
}