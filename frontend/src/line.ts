import {LanguageRenders, LanguageType} from "./render";
import {InputField} from "./fields/input";
import {SVGPictures} from "./svg";
import {OutField} from "./fields/output";

export class LineSnapshot {
    constructor(readonly value?: string,
                readonly type?: LanguageType,
                readonly timestamp = Date.now()) {
    }
}

class LineControls {
    constructor(parent: HTMLElement,
                editable: (editable: boolean) => boolean) {
        const main = document.createElement('article');
        main.classList.add('board-controls');
        const edit = document.createElement('button');
        edit.innerHTML = SVGPictures.Edit;
        let editState = false;
        editable(editState);
        edit.addEventListener('click', _ => {
            editState = editable(editState = !editState);
        });
        main.append(edit);
        parent.append(main);
    }
}

export class Line {
    private out: OutField;
    private input: InputField;
    private lastState = 0;
    private controls: LineControls;

    constructor(parent: HTMLElement, onchange: () => void) {
        const main = document.createElement('article');
        const header = document.createElement('header');
        const section = document.createElement('section');
        main.append(header, section);
        main.classList.add("line");
        this.input = new InputField(section,  language => {
            this.out.engine = LanguageRenders[language];
            onchange();
        });
        this.out = new OutField(section);
        this.input.addEventListener('change', ev => {
            this.out.value = ev.text;
            onchange()
        });
        this.controls = new LineControls(header, editable => {
            this.input.visible = editable;
            return editable;
        });
        parent.appendChild(main);
    }

    set data(data: LineSnapshot) {
        if (data.timestamp <= this.lastState)
            return;
        if (data.type) {
            this.out.engine = LanguageRenders[data.type];
            this.input.type = data.type;
        }
        if (data.value)
            this.input.value = this.out.value = data.value;
        this.lastState = data.timestamp;
    }

    get data(): LineSnapshot {
        return new LineSnapshot(this.input.value, this.input.type)
    }
}