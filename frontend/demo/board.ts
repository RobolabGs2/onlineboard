import '../entry/board.css'
import { Board, BoardActionsHandler, LineUpdate, StorageKeyGenerator } from "../common/board";
import { ColorThemesPanel } from "../common/style";
import { Themes } from "../common/themes";
import { LineID } from "../common/boardline";
import { LanguageType } from "../common/render";
import { LineSnapshot } from "../common/line";

const step = Math.floor(2147483647 / 10000);

class BoardManager implements BoardActionsHandler {
    private readonly lines = new Array<number>();
    public board: Board;
    private readonly keyGenerator = new StorageKeyGenerator("demoboard");

    constructor(readonly parent: HTMLElement,) {
        this.board = new Board(parent, this, this.keyGenerator);
    }

    public loadBoard(snapshot: Array<LineSnapshot>) {
        this.parent.removeChild(this.board.root);
        this.board = new Board(this.parent, this, this.keyGenerator);
        snapshot.forEach(value => this.addLineAfter(value));
    }

    addLineAfter(data: LineSnapshot, parentId?: LineID): LineID {
        let newLine = -1;
        if (this.lines.length === 0) {
            newLine = 0;
            this.lines.push(newLine);
        }
        else {
            const prev = parentId ? parentId as number : this.lines[this.lines.length - 1];
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

function fileAsText(file: File): Promise<string> {
    return new Promise<string>(function (resolve, reject) {
        const fileReader = new FileReader();
        fileReader.addEventListener("load", (ev) => {
            resolve(fileReader.result as string)
        });
        fileReader.addEventListener("error", reject);
        fileReader.readAsText(file);
    })
}

const boardSection = document.createElement("section");
document.body.append(boardSection);
const boardMan = new BoardManager(boardSection);
boardMan.loadBoard(JSON.parse('[{"value":"f(x)=max(x, 2x^2)\\\\\\\\k=6","type":"katex"},{"value":"((x,0, 1, 2, 3, 4, 5),\\n(x^2,0, 1, 4, 3, 4, 1),\\n(f(x),0, 2, 2, 3, 4, 5))","type":"asciimath"},{"value":"((1, 1,|, 2),\\n(2, 4,|, 2)\\n,(3, 3,|, 3),\\n(? ,?, |,?),\\n(? ,?, |,?))=>((3, 3,|, 3))-3((1, 1,|, 2))=((0, 0,|, 3!=0))=>text(решений нет)","type":"asciimath"},{"value":"oxtext(Доказать, что полна только при простых k:){1+x_1-x_2+x_1*x_2*x_3,0}","type":"asciimath"}]'));
const footer = document.createElement('footer');
const button = document.createElement('button');
button.textContent = "Получить json";
button.addEventListener('click', () => {
    const json = JSON.stringify(boardMan.board, undefined, 4);
    var blob = new Blob([json], {
        "type": "application/json"
    });
    const a = document.createElement("a");
    a.download = "board.json";
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

const buttonSet = document.createElement('input');
buttonSet.type = "file"
buttonSet.textContent = "Загрузить json";
buttonSet.addEventListener('change', function () {
    const file = this.files?.item(0);
    if (file) {
        fileAsText(file).then(text => boardMan.loadBoard(JSON.parse(text))).catch((reason) => alert(`Не удалось загрузить ${file.name}: ${reason}`))
    }
});

const header = document.body.getElementsByTagName('header')[0];
footer.append(button, buttonSet);
header.append(footer);
new ColorThemesPanel(header, Themes);

const githubRepo = document.createElement("a");
githubRepo.href = "https://github.com/RobolabGs2/onlineboard";
githubRepo.text = "Github";
document.body.append(githubRepo);