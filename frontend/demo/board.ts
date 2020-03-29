import '../entry/board.css'
import {Board, BoardActionsHandler, LineUpdate, StorageKeyGenerator} from "../common/board";
import {ColorThemesPanel} from "../common/style";
import {Themes} from "../common/themes";
import {LineID} from "../common/boardline";
import {LanguageType} from "../common/render";
import {LineSnapshot} from "../common/line";

const header = document.body.getElementsByTagName('header')[0];
new ColorThemesPanel(header, Themes);

const step = Math.floor(2147483647 / 10000);

class BoardManager implements BoardActionsHandler {
    private readonly lines = new Array<number>();
    readonly board: Board;
    constructor(parent: HTMLElement, init: Array<LineSnapshot>) {
        this.board = new Board(parent, this, new StorageKeyGenerator("demoboard"));
        init.forEach(value => this.addLineAfter(value));
    }
    addLineAfter(data: LineSnapshot, parentId?: LineID): LineID {
        let newLine = -1;
        if (this.lines.length === 0) {
            newLine = 0;
            this.lines.push(newLine);
        }
        else {
            const prev = parentId ? parentId as number:this.lines[this.lines.length-1];
            if (prev === this.lines[this.lines.length - 1]) {
                newLine = prev + step;
                this.lines.push(newLine);
            } else {
                const index = this.lines.findIndex((value => value == parentId));
                const next = this.lines[index + 1];
                newLine = prev + Math.floor((next - prev) / 2);
                if (newLine === prev) {
                    throw "Недостаточно места между строками!";
                }
                this.lines.splice(index + 1, 0, newLine);
            }
        }
        this.board.update(new LineUpdate(newLine, data, newLine));
        return newLine
    }
    addLine(parentId: LineID, type: LanguageType): Promise<LineID> {
        return Promise.resolve(this.addLineAfter(new LineSnapshot("", type), parentId));
    }

    deleteLine(id: number | string): Promise<boolean> {
        if (this.lines.length > 1) {
            this.lines.splice(this.lines.findIndex((value => value == id)), 1);
            this.board.update(new LineUpdate(id, undefined, -1));
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
}

const boardMan = new BoardManager(document.body, JSON.parse('[{"value":"f(x)=max(x, 2x^2)\\\\\\\\k=6","type":"katex"},{"value":"((x,0, 1, 2, 3, 4, 5),\\n(x^2,0, 1, 4, 3, 4, 1),\\n(f(x),0, 2, 2, 3, 4, 5))","type":"asciimath"},{"value":"((1, 1,|, 2),\\n(2, 4,|, 2)\\n,(3, 3,|, 3),\\n(? ,?, |,?),\\n(? ,?, |,?))=>((3, 3,|, 3))-3((1, 1,|, 2))=((0, 0,|, 3!=0))=>text(решений нет)","type":"asciimath"},{"value":"oxtext(Доказать, что полна только при простых k:){1+x_1-x_2+x_1*x_2*x_3,0}","type":"asciimath"}]'));

const footer = document.createElement('footer');
const button = document.createElement('button');
button.textContent = "Получить json";
button.addEventListener('click', () => alert(JSON.stringify(boardMan.board, undefined, 4)));
footer.append(button);
document.body.append(footer);