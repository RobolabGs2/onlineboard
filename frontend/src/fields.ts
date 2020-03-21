import * as katex from "katex";

class ChangeEvent {
    constructor(public readonly text: string | any) {
    }
}

interface RenderEngine {
    render(text: string, where: HTMLElement): void;
}

function escape(text: string) {
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, function(match) {
        // @ts-ignore
        return htmlEscapes[match];
    });
};

class PlainRender implements RenderEngine{
    render(text: string, where: HTMLElement): void {
        where.innerText = escape(text);
    }
}

class KaTeXRender implements RenderEngine {
    render(text: string, where: HTMLElement): void {
        katex.render(text, where, {
            output: "html", throwOnError: false,
        });
    }
}

export class OutField {
    private _renderer: RenderEngine;
    private _value: string;
    private readonly outputContainer: HTMLElement;

    constructor(parentNode: HTMLElement, render: RenderEngine = new KaTeXRender()) {
        this._renderer = render;
        parentNode.appendChild(this.outputContainer = document.createElement('article'));
        this.outputContainer.classList.add('board-layout');
    }

    set engine(render: RenderEngine) {
        this._renderer = render;
        this.render();
    }

    set value(text: string) {
        this._value = text;
        this.render();
    }

    private render() {
        this._renderer.render(this._value, this.outputContainer);
    }
}

interface InputFiledEventMap {
    "change": ChangeEvent
}

export class InputField {
    private readonly elem: HTMLTextAreaElement;
    private onchange = new Array<(this: this, ev: ChangeEvent) => void>();

    constructor(parent: HTMLElement) {
        this.elem = document.createElement('textarea');
        this.elem.classList.add('board-layout');
        this.elem.addEventListener("input", ev => {
            console.log(ev);
            this.onchange.forEach(x => x.bind(this)(new ChangeEvent(this.elem.value)));
        });
        let art = document.createElement('article');
        art.classList.add('board-layout');
        art.appendChild(this.elem);
        parent.appendChild(art)
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
}