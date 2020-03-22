import {InputField, OutField} from "./fields";
import {LanguageRenders, LanguageType} from "./render";

export class LineSnapshot {
    constructor(readonly value?: string,
                readonly type?: LanguageType,
                readonly timestamp = Date.now()) {
    }
}

class LineControls {
    private readonly typeElement: HTMLSelectElement;

    constructor(parent: HTMLElement,
                editable: (editable: boolean) => boolean,
                render: (engine: LanguageType) => void) {
        const main = document.createElement('article');
        main.classList.add('board-controls');
        const edit = document.createElement('button');
        edit.textContent = "Редактировать";
        let editState = false;
        editable(editState);
        edit.addEventListener('click', _ => {
            editState = editable(editState = !editState);
            if (editState) {
                edit.textContent = "Перестать редактировать";
            } else {
                edit.textContent = "Редактировать";
            }
        });
        this.typeElement = document.createElement('select');
        for (let render in LanguageRenders) {
            this.typeElement.add(new Option(render, render));
        }
        this.typeElement.addEventListener("change", _ => {
            render(this.type);
        });
        main.append(edit, this.typeElement);
        parent.append(main);
    }

    set type(type: LanguageType) {
        const opts = this.typeElement.options;
        for (let opt, j = 0; opt = opts[j]; j++) {
            if (opt.value == type) {
                this.typeElement.options.selectedIndex = j;
                return;
            }
        }
        alert(`Неизвестный тип рендера ${type}. Попробуйте перезагрузить страницу.`)
    }

    get type(): LanguageType {
        return this.typeElement.options[this.typeElement.selectedIndex].text as LanguageType;
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
        section.classList.add("board");
        this.input = new InputField(section);
        this.out = new OutField(section);
        this.input.addEventListener('change', ev => {
            this.out.value = ev.text;
            onchange()
        });
        this.controls = new LineControls(header, editable => {
            this.input.visible = editable;
            return editable;
        }, language => {
            this.out.engine = LanguageRenders[language];
            onchange();
        });
        parent.appendChild(main);
    }

    set data(data: LineSnapshot) {
        if (data.timestamp <= this.lastState)
            return;
        if (data.type) {
            this.out.engine = LanguageRenders[data.type];
            this.controls.type = data.type;
        }
        if (data.value)
            this.input.value = this.out.value = data.value;
        this.lastState = data.timestamp;
    }

    get data(): LineSnapshot {
        return new LineSnapshot(this.input.value, this.controls.type)
    }
}