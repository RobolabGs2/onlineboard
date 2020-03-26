import './boardline.css'

import {Line} from "./line";
import {ClickableSVGButton, SVGPictures} from "./utli/svg";

export type LineID = number | string;

class LineControls {
    private readonly delButton: ClickableSVGButton;
    private readonly addButton: ClickableSVGButton;
    private editState = true;

    constructor(parent: HTMLElement,
                private readonly editable: (editable: boolean) => boolean,
                del: () => void, add: () => void) {
        const main = document.createElement('article');
        main.classList.add('line-controls');
        new ClickableSVGButton(main, SVGPictures.Edit, () => {
            this.edit = !this.editState;
        });
        this.delButton = new ClickableSVGButton(main, SVGPictures.Delete, del);
        this.addButton = new ClickableSVGButton(main, SVGPictures.Add, add);
        parent.append(main);
    }

    set edit(editable: boolean) {
        if (editable === this.editState) {
            return
        }
        this.addButton.visible = this.delButton.visible = this.editState = this.editable(editable);
    }
}

export class LineInBoard {
    public readonly line: Line;
    private readonly section = document.createElement('section');
    private readonly controls: LineControls;

    constructor(main: HTMLElement, idBoard: string, idLine: LineID, order: number,
                onchange: (id: LineID) => void,
                changeFocus: (id: LineID, focus: boolean) => void,
                addLineAfter: (id: LineID, afterThis: LineInBoard) => void) {
        const article = document.createElement('article');
        article.addEventListener('focusin', _ => {
            article.classList.add('focus');
            changeFocus(idLine, true);
        });
        article.addEventListener('focusout', _ => {
            changeFocus(idLine, false);
            article.classList.remove('focus');
        });
        article.tabIndex = -1;
        article.classList.add('line');
        const controlsElem = document.createElement('header');
        const storageKey = [idBoard, idLine].join('/');
        this.controls = new LineControls(controlsElem,
            editable => {
                const state = this.line.editable = editable;
                localStorage.setItem(storageKey, JSON.stringify(state));
                return state;
            },
            () => fetch(`/board/${idBoard}/line/${idLine}`, {method: 'DELETE'}).catch(e => alert(e)),
            () => addLineAfter(idLine, this)
        );
        const lineSection = document.createElement('section');
        this.line = new Line(lineSection, onchange.bind(null, idLine));
        article.append(controlsElem, lineSection);
        this.section.append(article);
        main.append(this.section);
        this.order = order;
        this.edit = JSON.parse(localStorage.getItem(storageKey) || "false");
    }

    get order(): number {
        return Number.parseInt(this.section.style.order);
    }

    set order(order: number) {
        if (this.section.style.order !== order.toString()) {
            console.log(order);
            const tabIndex = Math.max(1, order);
            ['button', 'input', 'select', 'textarea'].forEach(selector => this.section
                .querySelectorAll(selector)
                .forEach((el) => {
                    (el as HTMLElement).tabIndex = tabIndex;
                }));
            this.section.style.order = order.toString()
        }
    }

    set edit(b: boolean) {
        this.controls.edit = b;
    }

    scroll() {
        this.section.scrollIntoView({block: 'center', behavior: 'smooth'});
    }

    delete() {
        this.section.remove();
    }
}