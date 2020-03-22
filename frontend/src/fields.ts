import * as katex from "katex";
import AsciiMathParser from '../lib/asciimath2tex';

class ChangeEvent {
    constructor(public readonly text: string | any) {
    }
}

export interface RenderEngine {
    render(text: string, where: HTMLElement): void;
}


export class ASCIIMathRender implements RenderEngine {
    private translate = new AsciiMathParser();
    // TODO: use MathJax
    private renderer = new KaTeXRender();
    render(text: string, where: HTMLElement): void {
        this.renderer.render(this.translate.parse(text), where);
    }
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
}

export class PlainRender implements RenderEngine{
    render(text: string, where: HTMLElement): void {
        const output = document.createElement('pre');
        output.classList.add('plaintext-render');
        output.innerText = escape(text);
        where.innerHTML = "";
        where.append(output)
    }
}

export class KaTeXRender implements RenderEngine {
    render(text: string, where: HTMLElement): void {
        katex.render(text, where, {
            output: "html", throwOnError: false,
        });
    }
}

export class OutField {
    private _renderer: RenderEngine;
    private _value: string = "";
    private readonly outputContainer: HTMLElement;
    private changed = false;
    constructor(parentNode: HTMLElement, render: RenderEngine = new KaTeXRender()) {
        this._renderer = render;
        parentNode.appendChild(this.outputContainer = document.createElement('article'));
        this.outputContainer.classList.add('board-layout');
        setInterval(() => {
            if (!this.changed)
                return;
            this.changed = false;
            this.render();
        }, 1000/40);
    }

    set engine(render: RenderEngine) {
        if (this._renderer === render)
            return;
        this.changed = true;
        this._renderer = render;
    }

    set value(text: string) {
        if (this._value === text)
            return;
        this._value = text;
        this.changed = true;
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
    private readonly rootElem: HTMLElement;
    constructor(parent: HTMLElement) {
        this.elem = document.createElement('textarea');
        this.elem.classList.add('board-layout');
        this.elem.addEventListener("input", _ => {
            this.onchange.forEach(x => x.call(this, new ChangeEvent(this.elem.value)));
        });
        this.rootElem = document.createElement('article');
        this.rootElem.classList.add('board-layout');
        this.rootElem.appendChild(this.elem);
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
    }
}