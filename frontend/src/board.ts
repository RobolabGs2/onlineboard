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
        this.button.addEventListener('click', ev => {
            onclick();
            ev.preventDefault();
        });
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
    public readonly line: Line;
    private readonly section = document.createElement('section');
    private readonly controls: LineControls;

    constructor(main: HTMLElement, idBoard: string, idLine: LineID, order: number,
                onchange: (id: LineID) => void,
                changeFocus: (id: LineID, focus: boolean) => void) {
        const article = document.createElement('article');
        article.addEventListener('focusin', _ => {
            article.classList.add('focus');
            changeFocus(idLine, true);
        });
        article.addEventListener('focusout', _ => {
            changeFocus(idLine, false);
            article.classList.remove('focus');
        });
        article.tabIndex = -1;
        article.classList.add('line');
        const controlsElem = document.createElement('header');
        const storageKey = [idBoard, idLine].join('/');
        this.controls = new LineControls(controlsElem,
            editable => {
                const state = this.line.editable = editable;
                localStorage.setItem(storageKey, JSON.stringify(state));
                return state;
            }, () =>
                fetch(`/board/${idBoard}/line/${idLine}`, {method: 'DELETE'})
                    .catch(e => alert(e))
        );
        const lineSection = document.createElement('section');
        this.line = new Line(lineSection, onchange.bind(null, idLine));
        article.append(controlsElem, lineSection);
        this.section.append(article);
        main.append(this.section);
        this.order = order;
        this.edit = JSON.parse(localStorage.getItem(storageKey) || "false");
    }

    get order(): number {
        return Number.parseInt(this.section.style.order);
    }

    set order(order: number) {
        if (this.section.style.order !== order.toString()) {
            console.log(order);
            const tabIndex = Math.max(1, order);
            ['button', 'input', 'select', 'textarea'].forEach(selector => this.section
                .querySelectorAll(selector)
                .forEach((el) => {
                    (el as HTMLElement).tabIndex = tabIndex;
                }));
            this.section.style.order = order.toString()
        }
    }

    set edit(b: boolean) {
        this.controls.edit = b;
    }

    scroll() {
        this.section.scrollIntoView({block: 'center', behavior: 'smooth'});
    }

    delete() {
        this.section.remove();
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
    private activeLine?: LineID;

    constructor(parentElem: HTMLElement, private readonly id: string) {
        this.root = document.createElement('article');
        this.root.classList.add('board');
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                if (ev.key === "Enter") {
                    this.lineForAppend().then(pair => {
                        pair.line.edit = false;
                        return fetch(`/board/${id}/line`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                parent: pair.id,
                                value: new LineSnapshot("", pair.line.line.type)
                            })
                        })
                    }).then(value => value.text())
                        .then(id => {
                            const newLine = this.lines.get(id);
                            if (!newLine)
                                throw 'Trouble this new line ' + id;
                            newLine.scroll();
                            newLine.edit = true;
                        })
                        .catch(e => alert(e));
                }
            }
        });
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

    update({id, number, value}: LineUpdate) {
        let boardLine = this.lines.get(id);
        if (!boardLine) {
            if (number === -1)
                return;
            boardLine = this.addLine(id, number);
        }
        if (number) {
            if (number === -1) {
                boardLine.delete();
                this.lines.delete(id);
                if (this.lastLine === id) {
                    this.findLastLine();
                }
                return;
            }
            Exists(this.lines.get(this.lastLine)).then(lastLine => {
                if (lastLine.order < number) {
                    this.lastLine = id;
                }
            }).catch(() => this.findLastLine());
            boardLine.order = number;
        }
        if (value)
            boardLine.line.data = value;
    }

    private lineForAppend(): Promise<{ id: LineID, line: LineInBoard }> {
        console.log(`Active line: ${this.activeLine}`);
        console.log(`Last line: ${this.lastLine}`);
        const id = this.activeLine ? this.activeLine : this.lastLine;
        return Exists(this.lines.get(id)).then(line => Promise.resolve({id, line}));
    }

    private addLine(id: LineID, number: number = Number.MAX_SAFE_INTEGER): LineInBoard {
        let lineInBoard = new LineInBoard(this.root, this.id, id, number,
            this.modified.add.bind(this.modified),
            (id, focused) => {
                if (focused) {
                    this.activeLine = id;
                    return
                }
                if (id === this.activeLine) {
                    this.activeLine = undefined;
                    return;
                }
            });
        if (this.lines.size === 0) {
            this.lastLine = id;
        }
        this.lines.set(id, lineInBoard);
        return lineInBoard
    }

    private findLastLine() {
        let maxOrder = 0;
        this.lines.forEach((value, key) => {
            if (value.order > maxOrder) {
                maxOrder = value.order;
                this.lastLine = key;
            }
        })
    }
}