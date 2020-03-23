import {LanguageRenders, LanguageType} from "../render";

class ChangeEvent {
    constructor(public readonly text: string | any) {
    }
}


interface InputFiledEventMap {
    "change": ChangeEvent
}

function resizeTextArea(textarea: HTMLTextAreaElement) {
    setTimeout(() => {
        textarea.style.cssText = 'height:auto;';
        textarea.style.cssText = `height: ${textarea.scrollHeight}px`;
    }, 0);
}

export class InputField {
    private readonly elem: HTMLTextAreaElement;
    private onchange = new Array<(this: this, ev: ChangeEvent) => void>();
    private readonly rootElem: HTMLElement;
    private readonly typeElement: HTMLSelectElement;
    constructor(parent: HTMLElement, render: (engine: LanguageType) => void) {
        this.elem = document.createElement('textarea');
        this.elem.addEventListener("input", _ => {
            this.onchange.forEach(x => x.call(this, new ChangeEvent(this.elem.value)));
            resizeTextArea(this.elem);
        });
        this.typeElement = document.createElement('select');
        for (let render in LanguageRenders) {
            this.typeElement.add(new Option(render, render));
        }
        this.typeElement.addEventListener("change", _ => {
            render(this.type);
        });
        this.rootElem = document.createElement('article');
        this.rootElem.append(this.typeElement, this.elem);
        parent.appendChild(this.rootElem)
    }

    addEventListener<K extends keyof InputFiledEventMap>(type: K, listener: (this: this, ev: InputFiledEventMap[K]) => void): number {
        switch (type) {
            case "change":
                return this.onchange.push(listener) - 1;
            default:
                throw `${type} cannot listen for InputField`;
        }
    }
    set value(text: string) {
        this.elem.value = text;
    }
    get value(): string{
        return this.elem.value
    }
    set visible(visible: boolean) {
        this.rootElem.style.display = visible ? "" : "none";
        if (visible) {
            this.elem.focus();
            resizeTextArea(this.elem);
        }
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