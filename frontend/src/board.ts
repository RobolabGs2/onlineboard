import {Line, LineSnapshot} from "./line";

type LineID = number | string;

class LineUpdate {
    constructor(readonly id: LineID,
                readonly value: LineSnapshot,
                readonly number?: number) {
    }
}

class LineInBoard {
    private readonly section = document.createElement('section');
    public readonly line: Line;

    constructor(article: HTMLElement, onchange: () => void, order: number) {
        this.line = new Line(this.section, onchange);
        this.order = order;
        article.append(this.section);
    }

    set order(order: number) {
        if (this.section.style.order !== order.toString()) {
            this.section.style.order = order.toString()
        }
    }
}

export class Board {
    private lines = new Map<LineID, LineInBoard>();
    private readonly root: HTMLElement;
    private modified = new Set<LineID>();

    constructor(parentElem: HTMLElement, id: string) {
        this.root = document.createElement('article');
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
        let lineInBoard = new LineInBoard(this.root, () => this.modified.add(id), number);
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
            boardLine = this.addLine(data.id);
        }
        if (data.number != null) {
            if (data.number === -1) {
                // TODO: delete
                // return
            }
            boardLine.order = data.number;
        }
        boardLine.line.data = data.value;
    }
}