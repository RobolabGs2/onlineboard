import './board.css'
import {LineSnapshot} from "./line";
import {Exists} from "./utli/promise";
import {LineID, LineInBoard} from "./boardline";
import {LanguageType} from "./render";

export class LineUpdate {
    constructor(readonly id: LineID,
                readonly value?: LineSnapshot,
                readonly number?: number) {
    }
}

export interface BoardActionsHandler {
    addLine(parentId: LineID, type: LanguageType): Promise<LineID>

    deleteLine(id: LineID): Promise<boolean>

}

export class StorageKeyGenerator {
    constructor(private readonly boardId: string) {
    }

    keyForLine(id: LineID) {
        return [this.boardId, id].join('/')
    }
}

export class Board {
    private lines = new Map<LineID, LineInBoard>();
    public readonly root: HTMLElement;
    private modified = new Set<LineID>();
    private lastLine: LineID = "";
    private activeLine?: LineID;

    constructor(parentElem: HTMLElement,
                private readonly actionsHandler: BoardActionsHandler,
                private readonly keyGenerator: StorageKeyGenerator) {
        this.root = document.createElement('article');
        this.root.classList.add('board');
        parentElem.appendChild(this.root);
        parentElem.addEventListener("keydown", ev => {
                if (ev.ctrlKey) {
                    if (ev.key === "Enter") {
                        this.activeOrLastLine()
                            .then(({id: parentId, line: parentLine}) => parentLine.append());
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

    toJSON() {
        const obj = new Array<LineInBoard>();
        this.lines.forEach(function (value) {
            obj.push(value);
        });
        return obj.sort((a, b) => a.order - b.order).map(value => value.line.data);
    }

    private addLineHandler(parentId: LineID, type: LanguageType): void {
        this.actionsHandler.addLine(parentId, type)
            .then(id => {
                const newLine = this.lines.get(id);
                if (!newLine)
                    throw 'Trouble this new line ' + id;
                newLine.scroll();
                newLine.edit = true;
            }).catch(e => alert(e))
    }

    private activeOrLastLine(): Promise<{ id: LineID, line: LineInBoard }> {
        return Exists(this.activeLine).catch(_ => Promise.resolve(this.lastLine))
            .then(id => Exists(this.lines.get(id)).then(line => Promise.resolve({id, line})));
    }

    private addLine(id: LineID, number: number = Number.MAX_SAFE_INTEGER): LineInBoard {
        let lineInBoard = new LineInBoard(this.root, number,
            {
                appendLine: (type) => {
                    this.addLineHandler(id, type)
                },
                changedLine: () => {
                    this.modified.add(id)
                },
                focusOnLine: (inFocus: boolean) => {
                    if (inFocus) {
                        this.activeLine = id;
                        return
                    }
                    if (id === this.activeLine) {
                        this.activeLine = undefined;
                        return;
                    }
                },
                delete: () => this.actionsHandler.deleteLine(id),
            },
            this.keyGenerator.keyForLine(id)
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