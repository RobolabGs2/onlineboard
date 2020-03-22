import {Line, LineSnapshot} from "./line";

class LineUpdate {
    constructor(readonly id: number, readonly data: LineSnapshot) {
    }
}

export class Board {
    private lines = new Array<Line>();
    private readonly root: HTMLElement;
    private modified = new Set<number>();

    constructor(parentElem: HTMLElement) {
        this.root = document.createElement('article');
        this.addLine(0);
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                if (ev.key === "Enter") {
                    this.addLine(this.lines.length)
                }
            }
        });
    }

    private addLine(id: number): Line {
        return this.lines[id] = new Line(this.root, () => {
            this.modified.add(id)
        })
    }

    changes(): Array<LineUpdate> {
        const res = new Array<LineUpdate>();
        this.modified.forEach(i => res.push(new LineUpdate(i, this.lines[i].data)));
        this.modified.clear();
        return res
    }

    update(data: LineUpdate) {
        let board = this.lines[data.id];
        if (!board) {
            board = this.addLine(data.id);
        }
        board.data = data.data;
    }
}