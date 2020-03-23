import AsciiMathParser from "../lib/asciimath2tex";
import * as katex from "katex";

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

export class PlainRender implements RenderEngine {
    render(text: string, where: HTMLElement): void {
        const output = document.createElement('pre');
        output.classList.add('plaintext-render');
        output.innerText = text;
        where.innerHTML = "";
        where.append(output)
    }
}

export class KaTeXRender implements RenderEngine {
    render(text: string, where: HTMLElement): void {
        katex.render(text, where, {
            output: "html", throwOnError: false, displayMode: true
        });
    }
}

export const LanguageRenders = {
    'katex': new KaTeXRender(),
    'plain': new PlainRender(),
    'asciimath': new ASCIIMathRender(),
};
export type LanguageType = keyof typeof LanguageRenders;