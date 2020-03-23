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
    constructor(parentNode: HTMLElement, svg: string, onclick: () => void) {
        const button = document.createElement('button');
        button.innerHTML = svg;
        button.addEventListener('click', onclick);
        parentNode.append(button);

    }
}

class LineControls {
    constructor(parent: HTMLElement,
                editable: (editable: boolean) => boolean,
                del: () => void) {
        const main = document.createElement('article');
        main.classList.add('line-controls');
        let editState = false;
        new ClickableSVGButton(main, SVGPictures.Edit, () => {
            editState = editable(editState = !editState);
        });
        new ClickableSVGButton(main, SVGPictures.Delete, del);
        parent.append(main);
    }
}

class LineInBoard {
    private readonly section = document.createElement('section');
    public readonly line: Line;

    constructor(main: HTMLElement, idBoard: string, idLine: LineID, onchange: (id: LineID) => void, order: number) {
        const article = document.createElement('article');
        article.classList.add('line');
        const header = document.createElement('header');
        new LineControls(header, editable => {
            return this.line.editable = editable;
        }, () => {
            fetch(`/board/${idBoard}/line/${idLine}`, {method: 'DELETE'})
                .catch(e => alert(e));
        });
        const lineSection = document.createElement('section');
        this.line = new Line(lineSection, onchange.bind(null, idLine));
        this.line.editable = false;
        this.order = order;
        article.append(header, lineSection);
        this.section.append(article);
        main.append(this.section);
    }

    set order(order: number) {
        if (this.section.style.order !== order.toString()) {
            this.section.style.order = order.toString()
        }
    }

    delete() {
        this.section.remove();
    }
}

export class Board {
    private lines = new Map<LineID, LineInBoard>();
    private readonly root: HTMLElement;
    private modified = new Set<LineID>();

    constructor(parentElem: HTMLElement, private readonly id: string) {
        this.root = document.createElement('article');
        this.root.classList.add('board');
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                if (ev.key === "Enter") {
                    fetch(`/board/${id}/line`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            parent: "", value: new LineSnapshot()
                        })
                    })
                        .then(value => value.text())
                        .then(id => console.log(id))
                        .catch(e => alert(e));
                }
            }
        });
    }

    private addLine(id: LineID, number: number = Number.MAX_SAFE_INTEGER): LineInBoard {
        let lineInBoard = new LineInBoard(this.root, this.id, id, this.modified.add.bind(this.modified), number);
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
                return;
            }
            boardLine.order = data.number;
        }
        boardLine.line.data = data.value;
    }
}