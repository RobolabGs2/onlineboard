import './board.css'
import {LineSnapshot} from "./line";
import {Exists} from "./utli/promise";
import {LineID, LineInBoard} from "./boardline";

class LineUpdate {
    constructor(readonly id: LineID,
                readonly value: LineSnapshot,
                readonly number?: number) {
    }
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
                        this.activeOrLastLine()
                            .then(({id: parentId, line: parentLine}) =>
                                this.addLineOverHttp(parentId, parentLine)).catch(e => alert(e));
                    }
                }
            }
        );
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

    private addLineOverHttp(parentId: LineID, parentLine: LineInBoard) {
        parentLine.edit = false;
        return fetch(`/board/${(this.id)}/line`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: parentId,
                value: new LineSnapshot("", parentLine.line.type)
            })
        }).then(value => value.text())
            .then(id => {
                const newLine = this.lines.get(id);
                if (!newLine)
                    throw 'Trouble this new line ' + id;
                newLine.scroll();
                newLine.edit = true;
            })
    }

    private activeOrLastLine(): Promise<{ id: LineID, line: LineInBoard }> {
        console.log(`Active line: ${this.activeLine}`);
        console.log(`Last line: ${this.lastLine}`);
        return Exists(this.activeLine).catch(_ => Promise.resolve(this.lastLine))
            .then(id => Exists(this.lines.get(id)).then(line => Promise.resolve({id, line})));
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
            },
            (id, line) => this.addLineOverHttp(id, line).catch(e => alert(e))
        );
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