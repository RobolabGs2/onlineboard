import {KaTeXRender, RenderEngine} from "../render";

export class OutField {
    private _renderer: RenderEngine;
    private _value: string = "";
    private readonly outputContainer: HTMLElement;
    private changed = false;

    constructor(parentNode: HTMLElement, render: RenderEngine = new KaTeXRender()) {
        this._renderer = render;
        parentNode.appendChild(this.outputContainer = document.createElement('article'));
        this.outputContainer.classList.add('output-container');
        setInterval(() => {
            if (!this.changed)
                return;
            this.changed = false;
            this.render();
        }, 1000 / 40);
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