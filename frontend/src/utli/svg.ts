// source: https://github.com/danklammer/bytesize-icons
export const SVGPictures = {
    Edit: makeSVG(`<path d="M30 7 L25 2 5 22 3 29 10 27 Z M21 6 L26 11 Z M5 22 L10 27 Z" />`, "i-edit"),
    Language: makeSVG(`<path d="M10 9 L3 17 10 25 M22 9 L29 17 22 25 M18 7 L14 27" />`, "i-code"),
    Delete: makeSVG(`<path d="M28 6 L6 6 8 30 24 30 26 6 4 6 M16 12 L16 24 M21 12 L20 24 M11 12 L12 24 M12 6 L13 2 19 2 20 6" />`, 'i-trash'),
    Add: makeSVG(`<path d="M16 2 L16 30 M2 16 L30 16" />`, 'i-plus')
};

function makeSVG(source: string, id: string, size: number = 24): string {
    return `<svg id="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1">${source}</svg>`
}

export class ClickableSVGButton {
    private readonly button = document.createElement('button');

    constructor(parentNode: HTMLElement, svg: string, onclick: () => void) {
        this.button.innerHTML = svg;
        this.button.addEventListener('click', ev => {
            onclick();
            ev.preventDefault();
        });
        parentNode.append(this.button);
    }

    set visible(visible: boolean) {
        this.button.style.display = visible ? "" : "none";
    }

    click() {
        this.button.click();
    }
}