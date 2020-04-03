import './boardline.css'

import {Line} from "./line";
import {ClickableSVGButton, SVGPictures} from "./utli/svg";
import {LanguageType} from "./render";

export type LineID = number;

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

    clickDel() {
        this.delButton.click()
    }

    clickAdd() {
        this.addButton.click()
    }
}

export interface LineInBoardActions {
    appendLine(type: LanguageType): void

    changedLine(): void

    focusOnLine(inFocus: boolean): void

    delete(): void
}

export class LineInBoard {
    public readonly line: Line;
    private readonly section = document.createElement('section');
    private readonly controls: LineControls;

    constructor(main: HTMLElement, order: number,
                actions: LineInBoardActions, storageKey: string) {
        const article = document.createElement('article');
        article.addEventListener('focusin', _ => {
            article.classList.add('focus');
            actions.focusOnLine(true);
        });
        article.addEventListener('focusout', _ => {
            actions.focusOnLine(false);
            article.classList.remove('focus');
        });
        article.tabIndex = -1;
        article.classList.add('line');
        const controlsElem = document.createElement('header');
        this.controls = new LineControls(controlsElem,
            editable => {
                const state = this.line.editable = editable;
                localStorage.setItem(storageKey, JSON.stringify(state));
                return state;
            },
            actions.delete,
            () => {
                actions.appendLine(this.line.type);
                this.edit = false;
            }
        );
        const lineSection = document.createElement('section');
        this.line = new Line(lineSection, actions.changedLine);
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

    append() {
        this.controls.clickAdd();
    }
}