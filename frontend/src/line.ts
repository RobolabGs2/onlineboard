import {LanguageRenders, LanguageType} from "./render";
import {InputField} from "./fields/input";
import {OutField} from "./fields/output";

export class LineSnapshot {
    constructor(readonly value?: string,
                readonly type?: LanguageType) {
    }
}

export class Line {
    private out: OutField;
    private input: InputField;

    constructor(section: HTMLElement, onchange: () => void) {
        this.input = new InputField(section, language => {
            this.out.engine = LanguageRenders[language];
            onchange();
        });
        this.out = new OutField(section);
        this.input.addEventListener('change', ev => {
            this.out.value = ev.text;
            onchange()
        });
    }

    set editable(editable: boolean) {
        this.input.visible = editable;
    }

    get type(): LanguageType {
        return this.input.type;
    }

    set type(type: LanguageType) {
        this.out.engine = LanguageRenders[type];
        this.input.type = type;
    }

    set value(value: string) {
        this.input.value = this.out.value = value
    }

    get data(): LineSnapshot {
        return new LineSnapshot(this.input.value, this.input.type)
    }

    set data(data: LineSnapshot) {
        if (data.type) {
            this.type = data.type;
        }
        if (data.value)
            this.value = data.value;
    }
}